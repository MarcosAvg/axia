import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { expect } from 'vitest'

import { authHeaders, type TicketHttpContext } from './tickets-http-helpers.js'
import { addEvidence, ticketBody } from './tickets-lifecycle-helpers.js'
import type { WriteRefs } from './tickets-write-helpers.js'

export type SyncResult = { status: string; code?: string }

type OfflineInput = {
  cookie: string
  ticketId: string
  type: string
  args?: Record<string, unknown>
  reportedAt: string
}

export function timestamp(value: Date | string): string {
  return new Date(value).toISOString()
}

export function atMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

export async function createTicketAt(
  context: TicketHttpContext,
  refs: WriteRefs,
  minutesAgo: number,
): Promise<string> {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(context.cookies.admin),
    payload: {
      ...ticketBody(refs),
      occurredAt: atMinutesAgo(minutesAgo),
      clientRequestId: randomUUID(),
    },
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { ticket: { id: string } }).ticket.id
}

export async function offline(
  context: TicketHttpContext,
  input: OfflineInput,
): Promise<SyncResult> {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/sync/actions',
    headers: authHeaders(input.cookie),
    payload: {
      deviceNow: new Date().toISOString(),
      items: [
        {
          clientRequestId: randomUUID(),
          ticketId: input.ticketId,
          type: input.type,
          args: input.args ?? {},
          clientReportedAt: input.reportedAt,
        },
      ],
    },
  })
  expect(response.statusCode).toBe(200)
  const result = (response.json() as { results: SyncResult[] }).results[0]
  expect(result, `${input.type}: ${result?.code ?? ''}`).toMatchObject({
    status: 'applied',
  })
  return result as SyncResult
}

export async function offlineAttendedTicket(
  context: TicketHttpContext,
  refs: WriteRefs,
): Promise<string> {
  const ticketId = await createTicketAt(context, refs, 120)
  const supervisor = context.cookies.supervisor
  await offline(context, {
    cookie: supervisor,
    ticketId,
    type: 'take',
    reportedAt: atMinutesAgo(100),
  })
  await offline(context, {
    cookie: supervisor,
    ticketId,
    type: 'assign_technician',
    args: { technicianId: refs.technicianId },
    reportedAt: atMinutesAgo(90),
  })
  await addEvidence(context, refs, ticketId, 'before')
  await offline(context, {
    cookie: context.cookies.technician,
    ticketId,
    type: 'start',
    reportedAt: atMinutesAgo(80),
  })
  await addEvidence(context, refs, ticketId, 'after')
  await offline(context, {
    cookie: context.cookies.technician,
    ticketId,
    type: 'attend',
    args: { workDescription: 'Trabajo sin conexión' },
    reportedAt: atMinutesAgo(70),
  })
  return ticketId
}

export async function eventTime(
  context: TicketHttpContext,
  ticketId: string,
  type: string,
): Promise<string> {
  const result = await context.db.execute(sql`
    select occurred_at from public.ticket_events
    where ticket_id = ${ticketId} and type = ${type}
    order by occurred_at desc, id desc
    limit 1
  `)
  return timestamp(
    (result.rows[0] as { occurred_at: Date | string }).occurred_at,
  )
}

export async function claimReasonId(
  context: TicketHttpContext,
): Promise<string> {
  const result = await context.db.execute(sql`
    select id from public.reasons
    where use = 'claim' and parent_id is null
    order by name
    limit 1
  `)
  return (result.rows[0] as { id: string }).id
}
