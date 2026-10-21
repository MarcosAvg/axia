import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'

export type CalendarInput = {
  name: string
  timezone: string
  active: boolean
}

export type IntervalInput = {
  weekday: number
  startTime: string
  endTime: string
}

type CalendarRow = {
  id: string
  name: string
  timezone: string
  active: boolean
}

type IntervalRow = {
  id: string
  calendar_id: string
  weekday: number
  start_time: string
  end_time: string
}

type HolidayRow = {
  id: string
  calendar_id: string
  holiday: string
  name: string | null
}

export async function listCalendars(db: Database) {
  const [calendars, intervals, holidays] = await Promise.all([
    db.execute(sql`
      select id, name, timezone, active from public.work_calendars order by name
    `),
    db.execute(sql`
      select id, calendar_id, weekday, start_time, end_time
      from public.work_calendar_intervals order by weekday, start_time
    `),
    db.execute(sql`
      select id, calendar_id, holiday, name
      from public.work_calendar_holidays order by holiday
    `),
  ])
  return (calendars.rows as CalendarRow[]).map((calendar) => ({
    ...calendar,
    intervals: (intervals.rows as IntervalRow[])
      .filter((row) => row.calendar_id === calendar.id)
      .map((row) => ({
        id: row.id,
        weekday: row.weekday,
        startTime: row.start_time.slice(0, 5),
        endTime: row.end_time.slice(0, 5),
      })),
    holidays: (holidays.rows as HolidayRow[])
      .filter((row) => row.calendar_id === calendar.id)
      .map((row) => ({
        id: row.id,
        holiday: row.holiday,
        name: row.name,
      })),
  }))
}

export async function createCalendar(db: Database, input: CalendarInput) {
  await db.execute(sql`
    insert into public.work_calendars (name, timezone, active)
    values (${input.name}, ${input.timezone}, ${input.active})
  `)
}

export async function updateCalendar(
  db: Database,
  id: string,
  input: CalendarInput,
) {
  const result = await db.execute(sql`
    update public.work_calendars
    set name = ${input.name}, timezone = ${input.timezone}, active = ${input.active}
    where id = ${id} returning id
  `)
  if (!result.rows[0])
    throw new AppError(404, 'not_found', 'Calendario no encontrado')
}

export async function addInterval(
  db: Database,
  calendarId: string,
  input: IntervalInput,
) {
  await db.execute(sql`
    insert into public.work_calendar_intervals (
      calendar_id, weekday, start_time, end_time
    ) values (
      ${calendarId}, ${input.weekday}, ${input.startTime}::time, ${input.endTime}::time
    )
  `)
}

export async function removeInterval(db: Database, id: string) {
  await db.execute(
    sql`delete from public.work_calendar_intervals where id = ${id}`,
  )
}

export async function addHoliday(
  db: Database,
  calendarId: string,
  holiday: string,
  name: string | null,
) {
  await db.execute(sql`
    insert into public.work_calendar_holidays (calendar_id, holiday, name)
    values (${calendarId}, ${holiday}::date, ${name})
  `)
}

export async function removeHoliday(db: Database, id: string) {
  await db.execute(
    sql`delete from public.work_calendar_holidays where id = ${id}`,
  )
}
