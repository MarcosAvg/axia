import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext
let baseUrl: string

async function get(path: string) {
  return fetch(`${baseUrl}${path}`, {
    headers: { Cookie: context.cookies.admin },
  })
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  const { db, ids } = context
  await db.execute(sql`
    update public.tickets
    set reported_at = '2026-01-01T00:00:00Z',
        status = 'closed',
        closed_at = '2026-01-01T10:00:00Z'
    where id = ${ids.ticketA1}
  `)
  await db.execute(sql`
    update public.tickets
    set reported_at = '2026-01-02T00:00:00Z',
        status = 'assigned',
        closed_at = null
    where id = ${ids.ticketA2}
  `)
  await db.execute(sql`
    insert into public.ticket_events (ticket_id, cycle, type)
    values (${ids.ticketA2}, 1, 'reopened')
  `)
  baseUrl = await context.app.listen({ host: '127.0.0.1', port: 0 })
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('reopen rate', () => {
  it('uses tickets that ever closed as denominator', async () => {
    const response = await get('/api/metrics/summary')
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      summary: { reopened: number; closed: number; reopenRate: number }
    }
    expect(body.summary.reopened).toBe(1)
    expect(body.summary.closed).toBe(1)
    expect(body.summary.reopenRate).toBeCloseTo(0.5, 3)
  })
})
