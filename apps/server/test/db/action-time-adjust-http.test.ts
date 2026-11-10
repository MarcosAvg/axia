import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  action,
  closedTicket,
  createTicket,
  takeAndAssign,
} from './tickets-lifecycle-helpers.js'
import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { reasonId } from './time-links-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

type EventRow = { id: string; occurred_at: Date | string }

async function eventRow(ticketId: string, type: string): Promise<EventRow> {
  const result = await context.db.execute(sql`
    select id, occurred_at from public.ticket_events
    where ticket_id = ${ticketId} and type = ${type}
    order by occurred_at desc, id desc
    limit 1
  `)
  return result.rows[0] as EventRow
}

async function closingEvent(ticketId: string): Promise<EventRow> {
  const result = await context.db.execute(sql`
    select id, occurred_at from public.ticket_events
    where ticket_id = ${ticketId}
      and type = 'validated'
      and coalesce(payload->>'partial', 'false') = 'false'
    order by occurred_at desc, id desc
    limit 1
  `)
  return result.rows[0] as EventRow
}

async function adjust(ticketId: string, eventId: string, occurredAt: string) {
  return context.app.inject({
    method: 'PATCH',
    url: `/api/tickets/${ticketId}/events/${eventId}/time`,
    headers: authHeaders(context.cookies.admin),
    payload: { occurredAt },
  })
}

async function closedAt(ticketId: string): Promise<string | null> {
  const result = await context.db.execute(sql`
    select closed_at from public.tickets where id = ${ticketId}
  `)
  const value = (result.rows[0] as { closed_at: Date | string | null })
    .closed_at
  return value ? new Date(value).toISOString() : null
}

async function coverageDelta(ticketId: string): Promise<string> {
  const result = await context.db.execute(sql`
    select delta from public.v_ticket_phase_coverage where id = ${ticketId}
  `)
  return (result.rows[0] as { delta: string }).delta
}

it('mueve el cierre y el tramo al ajustar el evento terminal', async () => {
  const ticketId = await closedTicket(context, refs)
  const closing = await closingEvent(ticketId)
  const proposed = new Date().toISOString()

  const response = await adjust(ticketId, closing.id, proposed)
  expect(response.statusCode).toBe(204)

  expect(await closedAt(ticketId)).toBe(proposed)
  expect(await coverageDelta(ticketId)).toBe('00:00:00')
  const span = await context.db.execute(sql`
    select ended_at from public.time_spans
    where ticket_id = ${ticketId} and kind = 'validation'
    order by started_at desc
    limit 1
  `)
  expect(
    new Date(
      (span.rows[0] as { ended_at: Date | string }).ended_at,
    ).toISOString(),
  ).toBe(proposed)
})

it('mueve el cierre al ajustar un rechazo', async () => {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  const rejected = await action(context, context.cookies.supervisor, ticketId, {
    action: 'reject',
    reasonId: await reasonId(context, 'rejection'),
    clientRequestId: randomUUID(),
  })
  expect(rejected.statusCode).toBe(200)

  const event = await eventRow(ticketId, 'rejected')
  const proposed = new Date().toISOString()
  const response = await adjust(ticketId, event.id, proposed)
  expect(response.statusCode).toBe(204)

  expect(await closedAt(ticketId)).toBe(proposed)
  expect(await coverageDelta(ticketId)).toBe('00:00:00')
})

it('no mueve el cierre al ajustar un evento no terminal', async () => {
  const ticketId = await closedTicket(context, refs)
  const before = await closedAt(ticketId)
  const started = await eventRow(ticketId, 'started')
  const attended = await eventRow(ticketId, 'attended')
  const startedMs = new Date(started.occurred_at).getTime()
  const attendedMs = new Date(attended.occurred_at).getTime()
  const proposed = new Date(
    startedMs + Math.max(1, Math.floor((attendedMs - startedMs) / 2)),
  ).toISOString()

  const response = await adjust(ticketId, started.id, proposed)
  expect(response.statusCode).toBe(204)

  expect(await closedAt(ticketId)).toBe(before)
  expect(await coverageDelta(ticketId)).toBe('00:00:00')
})
