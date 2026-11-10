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

async function calendar(name: string): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.work_calendars (name, timezone)
    values (${name}, 'UTC')
    returning id
  `)
  return (result.rows[0] as { id: string }).id
}

function addInterval(
  calendarId: string,
  weekday: number,
  startTime: string,
  endTime: string,
) {
  return context.app.inject({
    method: 'POST',
    url: `/api/admin/calendars/${calendarId}/intervals`,
    headers: authHeaders(context.cookies.admin),
    payload: { weekday, startTime, endTime },
  })
}

async function overlapHours(
  calendarId: string,
  start: string,
  end: string,
): Promise<number> {
  const result = await context.db.execute(sql`
    select extract(epoch from public.work_calendar_overlap(
      ${calendarId}, ${start}::timestamptz, ${end}::timestamptz
    )) / 3600 as hours
  `)
  return Number((result.rows[0] as { hours: string }).hours)
}

it('rechaza intervalos solapados en el mismo día', async () => {
  const calendarId = await calendar('Calendario solapado')
  expect((await addInterval(calendarId, 1, '09:00', '12:00')).statusCode).toBe(
    204,
  )
  const overlapping = await addInterval(calendarId, 1, '11:00', '13:00')
  expect(overlapping.statusCode).toBe(400)
  expect((overlapping.json() as { error: { code: string } }).error.code).toBe(
    'interval_overlap',
  )
})

it('cubre un turno nocturno entre dos días', async () => {
  const calendarId = await calendar('Calendario nocturno')
  expect((await addInterval(calendarId, 1, '22:00', '06:00')).statusCode).toBe(
    204,
  )
  expect(
    await overlapHours(
      calendarId,
      '2026-11-09T22:00:00Z',
      '2026-11-10T06:00:00Z',
    ),
  ).toBeCloseTo(8, 1)
})

it('rechaza un turno del día siguiente que pisa la madrugada nocturna', async () => {
  const calendarId = await calendar('Calendario nocturno solapado')
  expect((await addInterval(calendarId, 1, '22:00', '06:00')).statusCode).toBe(
    204,
  )
  const overlapping = await addInterval(calendarId, 2, '05:00', '07:00')
  expect(overlapping.statusCode).toBe(400)
})

it('no cuenta un festivo', async () => {
  const calendarId = await calendar('Calendario con festivo')
  expect((await addInterval(calendarId, 1, '22:00', '06:00')).statusCode).toBe(
    204,
  )
  await context.db.execute(sql`
    insert into public.work_calendar_holidays (calendar_id, holiday)
    values (${calendarId}, '2026-11-09'::date)
  `)
  expect(
    await overlapHours(
      calendarId,
      '2026-11-09T22:00:00Z',
      '2026-11-10T06:00:00Z',
    ),
  ).toBe(0)
})
