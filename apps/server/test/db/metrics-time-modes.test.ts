import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { createTicket, takeAndAssign } from './tickets-lifecycle-helpers.js'
import {
  authHeaders,
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

async function calendar(name: string, withInterval: boolean): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.work_calendars (name, timezone)
    values (${name}, 'UTC')
    returning id
  `)
  const id = (result.rows[0] as { id: string }).id
  if (withInterval) {
    await context.db.execute(sql`
      insert into public.work_calendar_intervals (
        calendar_id, weekday, start_time, end_time
      )
      select ${id}, day, '00:00'::time, '23:59'::time
      from generate_series(0, 6) as day
    `)
  }
  return id
}

async function span(
  ticketId: string,
  kind: string,
  minutes: number,
  calendarId: string | null,
) {
  const end = new Date(Date.now() - 60_000).toISOString()
  const start = new Date(Date.now() - (minutes + 1) * 60_000).toISOString()
  await context.db.execute(sql`
    insert into public.time_spans (
      ticket_id, cycle, kind, started_at, ended_at, work_calendar_id
    ) values (
      ${ticketId}, 1, ${kind}::public.time_span_kind,
      ${start}::timestamptz, ${end}::timestamptz, ${calendarId}
    )
  `)
}

it('devuelve continuo, laboral y extra por fase', async () => {
  await context.db.execute(sql`
    update public.tickets set reported_at = '2019-01-01T00:00:00Z'
  `)
  const calendarA = await calendar('Modos con cobertura', true)
  const calendarB = await calendar('Modos sin cobertura', false)
  const withCalendar = await createTicket(context, refs)
  const withoutCalendar = await createTicket(context, refs)
  await context.db.execute(sql`
    update public.tickets set reported_at = now() - interval '2 hours'
    where id in (${withCalendar}, ${withoutCalendar})
  `)
  await span(withCalendar, 'active_work', 60, calendarA)
  await span(withoutCalendar, 'active_work', 60, calendarB)

  const response = await context.app.inject({
    method: 'GET',
    url: '/api/metrics/summary?from=2026-01-01&to=2026-12-31',
    headers: authHeaders(context.cookies.admin),
  })
  expect(response.statusCode).toBe(200)
  const body = response.json() as {
    summary: {
      avgActive: number
      avgActiveLabor: number
      avgActiveExtra: number
      sumActiveLabor: number
      sumActiveExtra: number
    }
  }
  expect(body.summary.avgActive).toBeCloseTo(60, 0)
  expect(body.summary.avgActiveLabor).toBeCloseTo(30, 0)
  expect(body.summary.avgActiveExtra).toBeCloseTo(30, 0)
  expect(body.summary.sumActiveLabor).toBeCloseTo(60, 0)
  expect(body.summary.sumActiveExtra).toBeCloseTo(60, 0)
})

it('devuelve dormant y revisión de duplicado como indicadores propios', async () => {
  await context.db.execute(sql`
    update public.tickets set reported_at = '2019-01-01T00:00:00Z'
  `)
  const ticketId = await createTicket(context, refs)
  const duplicateId = await createTicket(context, refs)
  await context.db.execute(sql`
    update public.tickets
    set reported_at = now() - interval '2 hours', status = 'duplicate'
    where id = ${duplicateId}
  `)
  await span(ticketId, 'dormant', 20, null)
  await span(duplicateId, 'duplicate_review', 30, null)

  const response = await context.app.inject({
    method: 'GET',
    url: '/api/metrics/summary?from=2026-01-01&to=2026-12-31',
    headers: authHeaders(context.cookies.admin),
  })
  expect(response.statusCode).toBe(200)
  const summary = (
    response.json() as {
      summary: {
        avgDormant: number
        sumDormant: number
        avgDuplicateReview: number
        sumDuplicateReview: number
      }
    }
  ).summary
  expect(summary.avgDormant).toBeCloseTo(20, 0)
  expect(summary.sumDormant).toBeCloseTo(20, 0)
  expect(summary.avgDuplicateReview).toBeCloseTo(30, 0)
  expect(summary.sumDuplicateReview).toBeCloseTo(30, 0)
})

it('expone las variantes laborales por técnico y de cierre', async () => {
  await context.db.execute(sql`
    update public.tickets set reported_at = '2019-01-01T00:00:00Z'
  `)
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  await context.db.execute(sql`
    update public.tickets set reported_at = now() - interval '2 hours'
    where id = ${ticketId}
  `)

  const technicians = await context.app.inject({
    method: 'GET',
    url: '/api/metrics/technician-times',
    headers: authHeaders(context.cookies.admin),
  })
  expect(technicians.statusCode).toBe(200)
  const items = (
    technicians.json() as { items: Array<Record<string, unknown>> }
  ).items
  expect(items.length).toBeGreaterThan(0)
  expect(items[0]).toHaveProperty('avg_active_labor')
  expect(items[0]).toHaveProperty('avg_total_labor')
  expect(items[0]).toHaveProperty('avg_response_labor')
  expect(items[0]).toHaveProperty('avg_assignment_labor')
  expect(items[0]).toHaveProperty('avg_validation_labor')

  const summary = await context.app.inject({
    method: 'GET',
    url: '/api/metrics/summary?from=2026-01-01&to=2026-12-31',
    headers: authHeaders(context.cookies.admin),
  })
  expect(summary.statusCode).toBe(200)
  const groups = (
    summary.json() as {
      groups: Array<{ dimension: string; row: Record<string, unknown> }>
    }
  ).groups
  const category = groups.find((group) => group.dimension === 'category')
  expect(category).toBeTruthy()
  expect(typeof category?.row.avgTotalClosedLabor).toBe('number')
})
