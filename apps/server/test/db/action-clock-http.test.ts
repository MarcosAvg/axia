import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { withActionContext } from '../../src/tickets/event-context.js'
import { writeEvent } from '../../src/tickets/events.js'
import { action, createTicket } from './tickets-lifecycle-helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
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

it('sella una acción en línea como confiable y con la hora de la base', async () => {
  const ticketId = await createTicket(context, refs)
  const before = await context.db.execute(sql`select now() as at`)
  const response = await action(context, context.cookies.admin, ticketId, {
    action: 'comment',
    text: 'Sello de tiempo',
    clientRequestId: randomUUID(),
  })
  expect(response.statusCode).toBe(200)

  const row = await context.db.execute(sql`
    select occurred_at, time_confidence, client_reported_at
    from public.ticket_events
    where ticket_id = ${ticketId} and type = 'comment'
  `)
  const event = row.rows[0] as {
    occurred_at: Date | string
    time_confidence: string
    client_reported_at: Date | string | null
  }
  expect(new Date(event.occurred_at).getTime()).toBeGreaterThanOrEqual(
    new Date((before.rows[0] as { at: Date | string }).at).getTime(),
  )
  expect(event.time_confidence).toBe('trusted')
  expect(event.client_reported_at).toBeNull()
})

it('conserva la hora del dispositivo como auditoría y usa now() para la hora oficial', async () => {
  const ticketId = await createTicket(context, refs)
  const clientReportedAt = '2020-01-01T00:00:00.000Z'

  await context.db.transaction(async (tx) => {
    await withActionContext(
      {
        occurredAt: null,
        clientReportedAt,
        timeConfidence: 'unverified',
        clientClockSkewMs: 7_200_000,
        timeAlertKind: 'clock_skew',
        suggestedOccurredAt: null,
      },
      () => writeEvent(tx, { ticketId, type: 'comment' }),
    )
  })

  const row = await context.db.execute(sql`
    select occurred_at, client_reported_at, client_clock_skew_ms,
      time_confidence
    from public.ticket_events
    where ticket_id = ${ticketId} and type = 'comment'
  `)
  const event = row.rows[0] as {
    occurred_at: Date | string
    client_reported_at: Date | string
    client_clock_skew_ms: number | string
    time_confidence: string
  }
  expect(new Date(event.occurred_at).getUTCFullYear()).toBeGreaterThan(2000)
  expect(new Date(event.client_reported_at).toISOString()).toBe(
    clientReportedAt,
  )
  expect(Number(event.client_clock_skew_ms)).toBe(7_200_000)
  expect(event.time_confidence).toBe('unverified')
})
