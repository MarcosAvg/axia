import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { createTicket, takeAndAssign } from './tickets-lifecycle-helpers.js'
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

async function assignedTicket(): Promise<string> {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  return ticketId
}

function addEvidence(ticketId: string, payload: Record<string, unknown>) {
  return context.app.inject({
    method: 'POST',
    url: `/api/tickets/${ticketId}/evidence`,
    headers: authHeaders(context.cookies.technician),
    payload: {
      type: 'before',
      mimeType: 'image/png',
      clientRequestId: randomUUID(),
      ...payload,
    },
  })
}

async function evidenceRow(ticketId: string) {
  const result = await context.db.execute(sql`
    select occurred_at, client_captured_at, time_confidence
    from public.evidence
    where ticket_id = ${ticketId}
    order by occurred_at desc
    limit 1
  `)
  return result.rows[0] as {
    occurred_at: Date | string
    client_captured_at: Date | string | null
    time_confidence: string
  }
}

it('usa la hora de captura del dispositivo en la evidencia offline', async () => {
  const ticketId = await assignedTicket()
  const capturedAt = new Date().toISOString()
  const response = await addEvidence(ticketId, {
    clientCapturedAt: capturedAt,
    deviceNow: new Date().toISOString(),
  })
  expect(response.statusCode).toBe(201)

  const evidence = await evidenceRow(ticketId)
  expect(new Date(evidence.occurred_at).toISOString()).toBe(capturedAt)
  expect(new Date(evidence.client_captured_at ?? '').toISOString()).toBe(
    capturedAt,
  )
  expect(evidence.time_confidence).toBe('trusted')

  const event = await context.db.execute(sql`
    select occurred_at, time_confidence, client_reported_at
    from public.ticket_events
    where ticket_id = ${ticketId} and type = 'evidence_added'
  `)
  const row = event.rows[0] as {
    occurred_at: Date | string
    time_confidence: string
    client_reported_at: Date | string
  }
  expect(new Date(row.occurred_at).toISOString()).toBe(capturedAt)
  expect(new Date(row.client_reported_at).toISOString()).toBe(capturedAt)
  expect(row.time_confidence).toBe('trusted')
})

it('marca como no verificada una evidencia con reloj desfasado', async () => {
  const ticketId = await assignedTicket()
  const past = new Date(Date.now() - 4 * 60 * 60_000).toISOString()
  await context.db.execute(sql`
    update public.tickets set reported_at = ${past} where id = ${ticketId}
  `)
  await context.db.execute(sql`
    update public.ticket_events set occurred_at = ${past} where ticket_id = ${ticketId}
  `)
  const capturedAt = new Date(Date.now() - 3 * 60 * 60_000).toISOString()
  const deviceNow = new Date(Date.now() - 2 * 60 * 60_000).toISOString()
  const response = await addEvidence(ticketId, {
    clientCapturedAt: capturedAt,
    deviceNow,
  })
  expect(response.statusCode).toBe(201)

  const evidence = await evidenceRow(ticketId)
  expect(new Date(evidence.occurred_at).toISOString()).toBe(capturedAt)
  expect(evidence.time_confidence).toBe('unverified')

  const alerts = await context.db.execute(sql`
    select count(*)::int as count from public.ticket_time_alerts
    where ticket_id = ${ticketId} and status = 'open'
  `)
  expect((alerts.rows[0] as { count: number }).count).toBe(1)
})

it('rechaza una evidencia anterior a la última acción', async () => {
  const ticketId = await assignedTicket()
  const capturedAt = new Date(Date.now() - 60 * 60_000).toISOString()
  const response = await addEvidence(ticketId, {
    clientCapturedAt: capturedAt,
    deviceNow: new Date().toISOString(),
  })
  expect(response.statusCode).toBe(400)
  expect((response.json() as { error: { code: string } }).error.code).toBe(
    'time_out_of_order',
  )
})
