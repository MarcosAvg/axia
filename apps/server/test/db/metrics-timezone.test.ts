import { afterAll, beforeAll, expect, it } from 'vitest'

import { sql } from 'drizzle-orm'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext

beforeAll(async () => {
  context = await buildTicketHttpApp()
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

it('filtra y agrupa por la zona de la instancia', async () => {
  await context.db.execute(sql`
    update public.tickets
    set reported_at = '2026-01-01T00:00:00Z', closed_at = null
  `)
  await context.db.execute(sql`
    update public.tickets
    set reported_at = '2026-12-01T03:00:00Z',
        status = 'closed',
        closed_at = '2026-12-01T04:00:00Z'
    where id = ${context.ids.ticketA1}
  `)
  const ticket = await context.db.execute(sql`
    select public.metrics_date_in(
      '2026-12-01T03:00:00Z'::timestamptz,
      '2026-11-30'::date, '2026-11-30'::date,
      'America/Mexico_City'
    ) as belongs_to_previous_day,
    public.metrics_date_in(
      '2026-12-01T03:00:00Z'::timestamptz,
      '2026-12-01'::date, '2026-12-01'::date,
      'America/Mexico_City'
    ) as belongs_to_utc_day
  `)
  expect(ticket.rows[0]).toMatchObject({
    belongs_to_previous_day: true,
    belongs_to_utc_day: false,
  })

  const response = await context.app.inject({
    method: 'GET',
    url: '/api/metrics/summary?from=2026-11-30&to=2026-11-30',
    headers: authHeaders(context.cookies.admin),
  })
  expect(response.statusCode).toBe(200)
  const body = response.json() as {
    summary: { tickets: number }
    volume: Array<{ month: string; tickets: number }>
  }
  expect(body.summary.tickets).toBe(1)
  expect(body.volume).toEqual([{ month: '2026-11', tickets: 1 }])
})

it('rechaza una zona horaria inválida en el calendario', async () => {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/admin/calendars',
    headers: authHeaders(context.cookies.admin),
    payload: {
      name: 'Calendario con zona inválida',
      timezone: 'No/Existe',
      active: true,
    },
  })
  expect(response.statusCode).toBe(400)
  expect((response.json() as { error: { code: string } }).error.code).toBe(
    'invalid_timezone',
  )
})
