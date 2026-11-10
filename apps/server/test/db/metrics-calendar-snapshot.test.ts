import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { attendedTicket } from './tickets-lifecycle-helpers.js'
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

async function calendar(name: string, withIntervals: boolean): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.work_calendars (name, timezone)
    values (${name}, 'UTC')
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

function seconds(value: string | null): number {
  if (!value) return 0
  const [hours, minutes, rest] = value.split(':')
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(rest)
}

async function metric(path: string): Promise<Array<Record<string, unknown>>> {
  const response = await context.app.inject({
    method: 'GET',
    url: path,
    headers: authHeaders(context.cookies.admin),
  })
  expect(response.statusCode).toBe(200)
  return (response.json() as { items: Array<Record<string, unknown>> }).items
}

it('usa el calendario del tramo en los tiempos por técnico y solicitante', async () => {
  const calendarA = await calendar('Calendario métricas A', true)
  const calendarB = await calendar('Calendario métricas B', false)
  await context.db.execute(sql`
    update public.teams set work_calendar_id = ${calendarA}
    where id = ${refs.teamId}
  `)

  const ticketId = await attendedTicket(context, refs)
  await context.db.execute(sql`
    update public.teams set work_calendar_id = ${calendarB}
    where id = ${refs.teamId}
  `)
  await context.db.execute(
    sql`select public.rebuild_ticket_time_spans(${ticketId})`,
  )

  const technicians = await metric('/api/metrics/technician-subject-times')
  const technician = technicians.find(
    (row) => row.technician_id === refs.technicianId,
  )
  expect(
    seconds(technician?.active_time_labor as string | null),
  ).toBeGreaterThan(0)

  const requesters = await metric('/api/metrics/requester-times')
  const requester = requesters.find(
    (row) => row.requester_id === refs.requesterId,
  )
  expect(
    seconds(requester?.validation_time_labor as string | null),
  ).toBeGreaterThan(0)
})
