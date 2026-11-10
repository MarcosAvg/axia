import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

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

it('muestra la antigüedad de pendientes aunque estén fuera del periodo', async () => {
  await context.db.execute(sql`
    update public.tickets
    set reported_at = '2019-01-01T00:00:00Z', closed_at = null,
        status = 'closed'
  `)
  await context.db.execute(sql`
    update public.tickets
    set reported_at = '2020-01-01T00:00:00Z', status = 'registered'
    where id = ${context.ids.ticketA1}
  `)

  const response = await context.app.inject({
    method: 'GET',
    url: '/api/metrics/summary?from=2026-11-10&to=2026-11-10',
    headers: authHeaders(context.cookies.admin),
  })
  expect(response.statusCode).toBe(200)
  const body = response.json() as {
    summary: { tickets: number }
    aging: Array<{ id: string; ageMinutes: number }>
  }
  expect(body.summary.tickets).toBe(0)
  const aged = body.aging.find((row) => row.id === context.ids.ticketA1)
  expect(aged).toBeDefined()
  expect(aged?.ageMinutes).toBeGreaterThan(0)
})
