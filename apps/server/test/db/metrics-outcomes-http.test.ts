import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

type Summary = {
  tickets: number
  flowTickets: number
  closed: number
  rejected: number
  cancelled: number
  duplicate: number
  avgResolution: number
  avgTotal: number
}

type SummaryResponse = {
  summary: Summary
  groups: Array<{ dimension: string; row: { id: string; tickets: number } }>
}

type Item = Record<string, unknown>

let context: TicketHttpContext
let baseUrl: string

async function get(path: string, cookie = context.cookies.admin) {
  return fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie } })
}

async function summary(query = '') {
  const response = await get(`/api/metrics/summary${query}`)
  expect(response.status).toBe(200)
  return (await response.json()) as SummaryResponse
}

async function items(path: string) {
  const response = await get(`/api/metrics/${path}`)
  expect(response.status).toBe(200)
  return ((await response.json()) as { items: Item[] }).items
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
        status = 'rejected',
        closed_at = '2026-01-02T00:05:00Z'
    where id = ${ids.ticketA2}
  `)
  await db.execute(sql`
    update public.tickets
    set reported_at = '2026-01-03T00:00:00Z',
        status = 'cancelled',
        closed_at = '2026-01-03T00:05:00Z'
    where id = ${ids.ticketAux}
  `)
  await db.execute(sql`
    update public.tickets
    set reported_at = '2026-01-04T00:00:00Z',
        status = 'duplicate',
        closed_at = '2026-01-04T00:05:00Z'
    where id = ${ids.ticketB1}
  `)
  await db.execute(sql`
    update public.priorities set target_minutes = 1000
  `)
  await db.execute(sql`
    insert into public.ticket_events (
      ticket_id, cycle, type, actor_id, occurred_at
    )
    select ${ids.ticketB1}, 1, 'duplicate_marked', id,
      '2026-01-04T00:05:00Z'
    from public.users order by username limit 1
  `)
  baseUrl = await context.app.listen({ host: '127.0.0.1', port: 0 })
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('outcome metrics', () => {
  it('counts every outcome and resolves only closed tickets', async () => {
    const body = await summary()
    expect(body.summary).toMatchObject({
      tickets: 4,
      flowTickets: 1,
      closed: 1,
      rejected: 1,
      cancelled: 1,
      duplicate: 1,
    })
    expect(body.summary.avgResolution).toBeCloseTo(600, 0)
    expect(body.summary.avgTotal).toBeCloseTo(153.75, 1)
  })

  it('filters by outcome', async () => {
    const body = await summary('?outcome=cancelled')
    expect(body.summary.tickets).toBe(1)
    expect(body.summary.cancelled).toBe(1)
    expect(
      body.groups
        .filter((group) => group.dimension === 'status')
        .map((group) => group.row.id),
    ).toEqual(['cancelled'])
  })

  it('keeps outcomes out of SLA compliance', async () => {
    const rows = await items('sla')
    expect(rows).toEqual([expect.objectContaining({ with_target: 1, met: 1 })])
  })

  it('intersects the outcome filter with scope and dates', async () => {
    const team = await context.db.execute(sql`
      select id from public.teams where name = 'Equipo B'
    `)
    const teamB = String(team.rows[0]?.id)
    const byTeam = await get(
      `/api/metrics/summary?outcome=closed&teamId=${teamB}`,
    )
    expect(((await byTeam.json()) as SummaryResponse).summary.tickets).toBe(0)

    const scoped = await get(
      '/api/metrics/summary?outcome=duplicate',
      context.cookies.supervisor,
    )
    expect(((await scoped.json()) as SummaryResponse).summary.tickets).toBe(0)

    const byDate = await get(
      '/api/metrics/summary?outcome=closed&from=2026-01-05',
    )
    expect(((await byDate.json()) as SummaryResponse).summary.tickets).toBe(0)
  })

  it('keeps duplicates in volume and duplicate indicators', async () => {
    const rows = await items('duplicates-by-dimension')
    const total = rows.reduce((sum, row) => sum + Number(row.tickets ?? 0), 0)
    const duplicates = rows.reduce(
      (sum, row) => sum + Number(row.duplicates ?? 0),
      0,
    )
    expect(total).toBeGreaterThanOrEqual(4)
    expect(duplicates).toBeGreaterThanOrEqual(1)
  })
})
