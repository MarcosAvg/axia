import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { authHeaders } from './tickets-http-helpers.js'
import {
  action,
  addEvidence,
  createTicket,
  takeAndAssign,
} from './tickets-lifecycle-helpers.js'
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

type SyncResult = {
  status: string
  code?: string
  timeStatus?: string
  clockSkewMs?: number | null
  suggestedOccurredAt?: string | null
  timeAlertId?: string
}

async function sync(payload: Record<string, unknown>) {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/sync/actions',
    headers: authHeaders(context.cookies.admin),
    payload,
  })
  const results = (response.json() as { results: SyncResult[] }).results
  const result = results[0]
  if (!result) throw new Error('La sincronización no devolvió resultado')
  return { statusCode: response.statusCode, result }
}

async function olderAssignedTicket() {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  await addEvidence(context, refs, ticketId, 'before')
  const past = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  await context.db.execute(sql`
    update public.tickets set reported_at = ${past} where id = ${ticketId}
  `)
  await context.db.execute(sql`
    update public.ticket_events
    set occurred_at = ${past}
    where ticket_id = ${ticketId}
  `)
  return ticketId
}

it('acepta la hora del dispositivo y la marca no confiable si hay desfase', async () => {
  const ticketId = await olderAssignedTicket()
  const deviceNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  const deviceAction = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { statusCode, result } = await sync({
    deviceNow,
    items: [
      {
        clientRequestId: randomUUID(),
        ticketId,
        type: 'start',
        args: {},
        clientReportedAt: deviceAction,
      },
    ],
  })

  expect(statusCode).toBe(200)
  expect(result).toMatchObject({
    status: 'applied',
    timeStatus: 'skew_detected',
  })
  expect(result.clockSkewMs).toBeGreaterThan(60 * 60 * 1000)

  const event = await context.db.execute(sql`
    select occurred_at, client_reported_at, client_clock_skew_ms,
      time_confidence
    from public.ticket_events
    where ticket_id = ${ticketId} and type = 'started'
  `)
  const row = event.rows[0] as {
    occurred_at: Date | string
    client_reported_at: Date | string
    client_clock_skew_ms: number | string
    time_confidence: string
  }
  expect(new Date(row.occurred_at).toISOString()).toBe(deviceAction)
  expect(new Date(row.client_reported_at).toISOString()).toBe(deviceAction)
  expect(Number(row.client_clock_skew_ms)).toBeGreaterThan(60 * 60 * 1000)
  expect(row.time_confidence).toBe('unverified')

  const span = await context.db.execute(sql`
    select time_confidence
    from public.time_spans
    where ticket_id = ${ticketId} and kind = 'active_work'
    order by started_at desc
    limit 1
  `)
  expect((span.rows[0] as { time_confidence: string }).time_confidence).toBe(
    'unverified',
  )
})

it('rechaza una hora anterior al último evento y no crea tramos negativos', async () => {
  const ticketId = await createTicket(context, refs)
  await action(context, context.cookies.admin, ticketId, {
    action: 'comment',
    text: 'Primero',
    clientRequestId: randomUUID(),
  })

  const { statusCode, result } = await sync({
    deviceNow: new Date().toISOString(),
    items: [
      {
        clientRequestId: randomUUID(),
        ticketId,
        type: 'comment',
        args: { text: 'Fuera de orden' },
        clientReportedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    ],
  })

  expect(statusCode).toBe(200)
  expect(result).toMatchObject({
    status: 'rejected',
    code: 'time_out_of_order',
    timeStatus: 'manual_required',
  })

  const events = await context.db.execute(sql`
    select count(*)::int as count
    from public.ticket_events
    where ticket_id = ${ticketId} and type = 'comment'
  `)
  expect((events.rows[0] as { count: number }).count).toBe(1)

  const negative = await context.db.execute(sql`
    select count(*)::int as count
    from public.time_spans
    where ticket_id = ${ticketId} and ended_at < started_at
  `)
  expect((negative.rows[0] as { count: number }).count).toBe(0)
})

it('marca no confiable un lote sin deviceNow', async () => {
  const ticketId = await olderAssignedTicket()
  const deviceAction = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { result } = await sync({
    items: [
      {
        clientRequestId: randomUUID(),
        ticketId,
        type: 'comment',
        args: { text: 'Sin reloj de dispositivo' },
        clientReportedAt: deviceAction,
      },
    ],
  })

  expect(result).toMatchObject({
    status: 'applied',
    timeStatus: 'skew_detected',
  })
  expect(result.clockSkewMs).toBeNull()

  const event = await context.db.execute(sql`
    select time_confidence
    from public.ticket_events
    where ticket_id = ${ticketId} and type = 'comment'
  `)
  expect((event.rows[0] as { time_confidence: string }).time_confidence).toBe(
    'unverified',
  )
})

it('acepta la hora del dispositivo si el desfase está dentro de la tolerancia', async () => {
  const ticketId = await olderAssignedTicket()
  const deviceNow = new Date(Date.now() + 60_000).toISOString()
  const deviceAction = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { result } = await sync({
    deviceNow,
    items: [
      {
        clientRequestId: randomUUID(),
        ticketId,
        type: 'comment',
        args: { text: 'Reloj casi en hora' },
        clientReportedAt: deviceAction,
      },
    ],
  })

  expect(result.timeStatus).toBe('ok')
  const event = await context.db.execute(sql`
    select time_confidence
    from public.ticket_events
    where ticket_id = ${ticketId} and type = 'comment'
  `)
  expect((event.rows[0] as { time_confidence: string }).time_confidence).toBe(
    'trusted',
  )
})
