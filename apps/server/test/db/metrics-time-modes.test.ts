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
      select ${id}, day, '00:00'::time, '24:00'::time
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

it('cuenta completa la ventana laboral que cruza la medianoche', async () => {
  const calendarId = await calendar('Modos con medianoche', true)
  const result = await context.db.execute(sql`
    select public.work_calendar_overlap(
      ${calendarId},
      '2026-03-02T23:29:00Z'::timestamptz,
      '2026-03-03T00:30:00Z'::timestamptz
    ) as overlap
  `)
  expect((result.rows[0] as { overlap: string }).overlap).toBe('01:01:00')
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

async function seedRepeatedSubstate(calendarId: string, ticketId: string) {
  await context.db.execute(sql`
    insert into public.work_calendar_intervals (calendar_id, weekday, start_time, end_time)
    values (${calendarId}, 1, '08:00', '08:55')
  `)
  await context.db.execute(sql`
    with root as (
      insert into public.reasons (use, name)
      values ('pause', 'Raíz de reloj de pausa') returning id
    ), step as (
      insert into public.reasons (use, name, parent_id)
      select 'pause', 'Subestado de reloj de pausa', id from root returning id, parent_id
    ), pause as (
      insert into public.ticket_pauses (
        ticket_id, cycle, reason_id, root_reason_id, opened_at, closed_at, work_calendar_id
      )
      select ${ticketId}, 1, id, parent_id, '2026-03-02 08:00Z',
        '2026-03-02 10:10Z', ${calendarId} from step
      returning id, reason_id
    )
    insert into public.ticket_pause_steps (pause_id, reason_id, entered_at, exited_at)
    select id, reason_id, bounds.start_at, bounds.end_at
    from pause cross join (values
      ('2026-03-02 08:00Z'::timestamptz, '2026-03-02 08:10Z'::timestamptz),
      ('2026-03-02 08:20Z'::timestamptz, '2026-03-02 10:10Z'::timestamptz)
    ) as bounds(start_at, end_at)
  `)
}

it('suma estancias repetidas por subestado con el calendario guardado en la pausa', async () => {
  const calendarId = await calendar('Turno de la pausa', false)
  const ticketId = await createTicket(context, refs)
  await seedRepeatedSubstate(calendarId, ticketId)
  const initial = await substateDuration()
  expect(initial?.pauses).toBe(1)
  expect(Number(initial?.pause_minutes)).toBe(120)
  expect(Number(initial?.pause_labor_minutes)).toBe(45)

  await context.db.execute(sql`
    insert into public.work_calendar_holidays (calendar_id, holiday)
    values (${calendarId}, '2026-03-02')
  `)
  expect(Number((await substateDuration())?.pause_labor_minutes)).toBe(0)

  await context.db.execute(sql`
    update public.work_calendars set active = false where id = ${calendarId}
  `)
  await context.db.execute(sql`
    with open_pause as (
      insert into public.ticket_pauses (
        ticket_id, cycle, reason_id, root_reason_id, opened_at, work_calendar_id
      )
      select ticket_id, cycle, reason_id, root_reason_id,
        now() - interval '10 min', work_calendar_id
      from public.ticket_pauses where ticket_id = ${ticketId}
      returning id, reason_id, opened_at
    )
    insert into public.ticket_pause_steps (pause_id, reason_id, entered_at)
    select id, reason_id, opened_at from open_pause
  `)
  const withOpenPause = await substateDuration()
  expect(withOpenPause?.pauses).toBe(2)
  expect(Number(withOpenPause?.pause_minutes)).toBeCloseTo(130, 0)
  expect(Number(withOpenPause?.pause_labor_minutes)).toBe(
    Number(withOpenPause?.pause_minutes),
  )
})

async function substateDuration() {
  const response = await context.app.inject({
    method: 'GET',
    url: '/api/metrics/pause-substates',
    headers: authHeaders(context.cookies.admin),
  })
  expect(response.statusCode).toBe(200)
  return (
    response.json() as {
      items: Array<{
        substate_name: string
        pauses: number
        pause_minutes: string
        pause_labor_minutes: string
      }>
    }
  ).items.find((item) => item.substate_name === 'Subestado de reloj de pausa')
}
