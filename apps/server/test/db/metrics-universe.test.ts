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

type SummaryBody = {
  summary: {
    tickets: number
    duplicate: number
    avgActive: number
    avgTotal: number
    avgTotalAll: number
    avgTotalClosed: number
    sumTotalAll: number
    sumTotalClosed: number
  }
  groups: Array<{
    dimension: string
    row: { id: string; tickets: number }
  }>
}

async function summary(query: string): Promise<SummaryBody> {
  const response = await context.app.inject({
    method: 'GET',
    url: `/api/metrics/summary?${query}`,
    headers: authHeaders(context.cookies.admin),
  })
  expect(response.statusCode).toBe(200)
  return response.json() as SummaryBody
}

async function activeSpan(
  ticketId: string,
  minutes: number,
  endedAt = '2026-11-10T12:00:00Z',
) {
  await context.db.execute(sql`
    insert into public.time_spans (
      ticket_id, cycle, kind, started_at, ended_at
    ) values (
      ${ticketId}, 1, 'active_work',
      ${endedAt}::timestamptz - (${minutes} || ' minutes')::interval,
      ${endedAt}::timestamptz
    )
  `)
}

it('excluye duplicados y tiempo no verificado de las medias de desempeño', async () => {
  await context.db.execute(sql`
    update public.tickets
    set reported_at = '2019-01-01T00:00:00Z', closed_at = null
  `)
  const closed = context.ids.ticketA1
  const rejected = context.ids.ticketA2
  const duplicate = context.ids.ticketAux
  const unverified = context.ids.ticketB1

  await context.db.execute(sql`
    update public.tickets
    set reported_at = '2026-11-10T06:00:00Z', status = 'closed',
        closed_at = '2026-11-10T18:00:00Z'
    where id = ${closed}
  `)
  await context.db.execute(sql`
    update public.tickets
    set reported_at = '2026-11-10T06:00:00Z', status = 'rejected',
        closed_at = '2026-11-10T18:00:00Z'
    where id = ${rejected}
  `)
  await context.db.execute(sql`
    update public.tickets
    set reported_at = '2026-11-10T06:00:00Z', status = 'duplicate',
        closed_at = '2026-11-10T18:00:00Z'
    where id = ${duplicate}
  `)
  await context.db.execute(sql`
    update public.tickets
    set reported_at = '2026-11-10T06:00:00Z', status = 'closed',
        closed_at = '2026-11-10T18:00:00Z'
    where id = ${unverified}
  `)
  await activeSpan(closed, 60)
  await activeSpan(rejected, 30)
  await activeSpan(duplicate, 120)
  await activeSpan(unverified, 90)
  await context.db.execute(sql`
    insert into public.ticket_events (
      ticket_id, cycle, type, actor_id, occurred_at, time_confidence
    ) values (
      ${unverified}, 1, 'comment', ${context.people.adminId},
      '2026-11-10T12:00:00Z', 'unverified'
    )
  `)

  const body = await summary('from=2026-11-10&to=2026-11-10')
  expect(body.summary.tickets).toBe(4)
  expect(body.summary.duplicate).toBe(1)
  expect(body.summary.avgActive).toBeCloseTo(45, 1)
  const duplicateGroup = body.groups.find(
    (group) => group.dimension === 'outcome' && group.row.id === 'duplicate',
  )
  expect(duplicateGroup?.row.tickets).toBe(1)
})

it('separa el tiempo total de todos del tiempo de resolución cerrada', async () => {
  await context.db.execute(sql`
    update public.tickets
    set reported_at = '2019-01-01T00:00:00Z', closed_at = null
  `)
  await context.db.execute(sql`
    update public.tickets
    set reported_at = now() - interval '10 hours',
        status = 'closed', closed_at = now()
    where id = ${context.ids.ticketA1}
  `)
  await context.db.execute(sql`
    update public.tickets
    set reported_at = now() - interval '1 hour',
        status = 'assigned', closed_at = null
    where id = ${context.ids.ticketA2}
  `)

  const body = await summary('from=2026-01-01&to=2026-12-31')
  expect(body.summary.avgTotalAll).toBeCloseTo(330, 0)
  expect(body.summary.avgTotalClosed).toBeCloseTo(600, 0)
  expect(body.summary.sumTotalAll).toBeCloseTo(660, 0)
  expect(body.summary.sumTotalClosed).toBeCloseTo(600, 0)
})
