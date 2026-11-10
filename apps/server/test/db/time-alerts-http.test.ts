import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { action, attendedTicket } from './tickets-lifecycle-helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { authHeaders } from './tickets-http-helpers.js'
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
  eventId?: number
  timeStatus?: string
}

async function sync(payload: Record<string, unknown>) {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/sync/actions',
    headers: authHeaders(context.cookies.admin),
    payload,
  })
  return {
    statusCode: response.statusCode,
    result: (response.json() as { results: SyncResult[] })
      .results[0] as SyncResult,
  }
}

async function olderAttendedTicket() {
  const ticketId = await attendedTicket(context, refs)
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

it('crea la alerta, avisa y bloquea la validación', async () => {
  const ticketId = await olderAttendedTicket()
  const deviceNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  const deviceAction = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { result } = await sync({
    deviceNow,
    items: [
      {
        clientRequestId: randomUUID(),
        ticketId,
        type: 'comment',
        args: { text: 'Comentario con reloj desfasado' },
        clientReportedAt: deviceAction,
      },
    ],
  })
  expect(result.timeStatus).toBe('skew_detected')

  const alerts = await context.db.execute(sql`
    select a.id, a.event_id, a.kind, a.suggested_occurred_at
    from public.ticket_time_alerts a
    where a.ticket_id = ${ticketId} and a.status = 'open'
  `)
  expect(alerts.rows).toHaveLength(1)
  expect(alerts.rows[0]).toMatchObject({
    event_id: String(result.eventId),
    kind: 'clock_skew',
  })

  const alertResponse = await context.app.inject({
    method: 'GET',
    url: `/api/tickets/${ticketId}/time-alerts`,
    headers: authHeaders(context.cookies.admin),
  })
  expect(alertResponse.statusCode).toBe(200)
  expect(
    (alertResponse.json() as { items: Array<{ eventType: string }> }).items,
  ).toEqual([expect.objectContaining({ eventType: 'comment' })])

  const validation = await action(
    context,
    context.cookies.requester,
    ticketId,
    {
      action: 'validate',
      clientRequestId: randomUUID(),
    },
  )
  expect(validation.statusCode).toBe(409)
  expect(validation.json()).toMatchObject({
    error: { code: 'time_unverified' },
  })

  const comment = await action(context, context.cookies.admin, ticketId, {
    action: 'comment',
    text: 'Comentario permitido con alerta',
    clientRequestId: randomUUID(),
  })
  expect(comment.statusCode).toBe(200)

  const notifications = await context.db.execute(sql`
    select count(*)::int as count
    from public.notifications
    where ticket_id = ${ticketId} and type = 'time_alert'
  `)
  expect((notifications.rows[0] as { count: number }).count).toBeGreaterThan(0)
})
