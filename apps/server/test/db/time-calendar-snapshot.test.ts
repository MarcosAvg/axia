import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

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

async function calendar(name: string, withIntervals: boolean): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.work_calendars (name, timezone)
    values (${name}, 'America/Mexico_City')
    returning id
  `)
  const id = (result.rows[0] as { id: string }).id
  if (withIntervals) {
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

async function startedTicket(calendarId: string): Promise<string> {
  await context.db.execute(sql`
    update public.teams set work_calendar_id = ${calendarId}
    where id = ${refs.teamId}
  `)
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  await addEvidence(context, refs, ticketId, 'before')
  await action(context, context.cookies.technician, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  return ticketId
}

async function labor(ticketId: string, kind: string): Promise<number> {
  const result = await context.db.execute(sql`
    select extract(epoch from public.ticket_time_by_kind_laboral(
      ${ticketId}, ${kind}::public.time_span_kind
    )) / 60 as minutes
  `)
  return Number((result.rows[0] as { minutes: string }).minutes)
}

it('congela el calendario del evento, tramo y participación', async () => {
  const calendarA = await calendar('Calendario congelado A', true)
  const calendarB = await calendar('Calendario congelado B', false)
  const ticketId = await startedTicket(calendarA)

  const event = await context.db.execute(sql`
    select work_calendar_id from public.ticket_events
    where ticket_id = ${ticketId} and type = 'started'
  `)
  expect((event.rows[0] as { work_calendar_id: string }).work_calendar_id).toBe(
    calendarA,
  )
  const span = await context.db.execute(sql`
    select work_calendar_id from public.time_spans
    where ticket_id = ${ticketId} and kind = 'active_work'
  `)
  expect((span.rows[0] as { work_calendar_id: string }).work_calendar_id).toBe(
    calendarA,
  )
  const participant = await context.db.execute(sql`
    select work_calendar_id from public.ticket_participants
    where ticket_id = ${ticketId} and ended_at is null
  `)
  expect(
    (participant.rows[0] as { work_calendar_id: string }).work_calendar_id,
  ).toBe(calendarA)
  expect(await labor(ticketId, 'active_work')).toBeGreaterThan(0)

  await context.db.execute(sql`
    update public.teams set work_calendar_id = ${calendarB}
    where id = ${refs.teamId}
  `)
  await context.db.execute(
    sql`select public.rebuild_ticket_time_spans(${ticketId})`,
  )

  const rebuilt = await context.db.execute(sql`
    select work_calendar_id from public.time_spans
    where ticket_id = ${ticketId} and kind = 'active_work'
  `)
  expect(
    (rebuilt.rows[0] as { work_calendar_id: string }).work_calendar_id,
  ).toBe(calendarA)
  expect(await labor(ticketId, 'active_work')).toBeGreaterThan(0)
})

it('congela la clasificación de reloj del motivo en el tramo', async () => {
  const calendarA = await calendar('Calendario reloj', true)
  const ticketId = await startedTicket(calendarA)
  const reason = await context.db.execute(sql`
    update public.reasons set clock_class = 'not_counted'
    where id = ${refs.pauseReasonId}
    returning id
  `)
  const reasonId = (reason.rows[0] as { id: string }).id
  const paused = await action(context, context.cookies.technician, ticketId, {
    action: 'pause',
    reasonId,
    clientRequestId: randomUUID(),
  })
  expect(paused.statusCode).toBe(200)

  await context.db.execute(sql`
    update public.reasons set clock_class = 'counted' where id = ${reasonId}
  `)
  await context.db.execute(
    sql`select public.rebuild_ticket_time_spans(${ticketId})`,
  )

  const pause = await context.db.execute(sql`
    select work_calendar_id from public.ticket_pauses
    where ticket_id = ${ticketId}
    order by opened_at desc limit 1
  `)
  expect((pause.rows[0] as { work_calendar_id: string }).work_calendar_id).toBe(
    calendarA,
  )

  const event = await context.db.execute(sql`
    select clock_class from public.ticket_events
    where ticket_id = ${ticketId} and type = 'paused'
  `)
  expect((event.rows[0] as { clock_class: string }).clock_class).toBe(
    'not_counted',
  )
  const span = await context.db.execute(sql`
    select clock_class from public.time_spans
    where ticket_id = ${ticketId} and kind = 'pause'
  `)
  expect((span.rows[0] as { clock_class: string }).clock_class).toBe(
    'not_counted',
  )
})
