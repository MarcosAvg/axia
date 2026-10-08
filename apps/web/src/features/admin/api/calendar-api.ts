// Lectura y escritura de calendarios laborales (franjas y festivos). La RLS exige
// catalog.manage para escribir (ADR 0018).

import { supabase } from '@/lib/supabase'
import { shortTime, sortHolidays, sortIntervals } from '../domain/calendar'
import type {
  CalendarHoliday,
  CalendarInput,
  CalendarInterval,
  IntervalInput,
  WorkCalendar,
} from '../domain/calendar'

interface IntervalRow {
  id: string
  weekday: number
  start_time: string
  end_time: string
}
interface HolidayRow {
  id: string
  holiday: string
  name: string | null
}
interface CalendarRow {
  id: string
  name: string
  timezone: string
  active: boolean
  work_calendar_intervals: IntervalRow[]
  work_calendar_holidays: HolidayRow[]
}

const SELECT =
  'id, name, timezone, active, ' +
  'work_calendar_intervals(id, weekday, start_time, end_time), ' +
  'work_calendar_holidays(id, holiday, name)'

function parseCalendar(row: CalendarRow): WorkCalendar {
  return {
    id: row.id,
    name: row.name,
    timezone: row.timezone,
    active: row.active,
    intervals: sortIntervals(
      row.work_calendar_intervals.map((item): CalendarInterval => ({
        id: item.id,
        weekday: item.weekday,
        startTime: shortTime(item.start_time),
        endTime: shortTime(item.end_time),
      })),
    ),
    holidays: sortHolidays(
      row.work_calendar_holidays.map((item): CalendarHoliday => ({
        id: item.id,
        holiday: item.holiday,
        name: item.name,
      })),
    ),
  }
}

export async function fetchCalendars(): Promise<WorkCalendar[]> {
  const { data, error } = await supabase
    .from('work_calendars')
    .select(SELECT)
    .order('name')
  if (error) throw error
  return ((data ?? []) as unknown as CalendarRow[]).map(parseCalendar)
}

export async function createCalendar(input: CalendarInput): Promise<void> {
  const { error } = await supabase.from('work_calendars').insert({
    name: input.name,
    timezone: input.timezone,
    active: input.active,
  })
  if (error) throw error
}

export async function updateCalendar(
  id: string,
  input: CalendarInput,
): Promise<void> {
  const { error } = await supabase
    .from('work_calendars')
    .update({
      name: input.name,
      timezone: input.timezone,
      active: input.active,
    })
    .eq('id', id)
  if (error) throw error
}

export async function addInterval(
  calendarId: string,
  input: IntervalInput,
): Promise<void> {
  const { error } = await supabase.from('work_calendar_intervals').insert({
    calendar_id: calendarId,
    weekday: input.weekday,
    start_time: input.startTime,
    end_time: input.endTime,
  })
  if (error) throw error
}

export async function removeInterval(id: string): Promise<void> {
  const { error } = await supabase
    .from('work_calendar_intervals')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function addHoliday(
  calendarId: string,
  holiday: string,
  name: string | null,
): Promise<void> {
  const { error } = await supabase.from('work_calendar_holidays').insert({
    calendar_id: calendarId,
    holiday,
    name,
  })
  if (error) throw error
}

export async function removeHoliday(id: string): Promise<void> {
  const { error } = await supabase
    .from('work_calendar_holidays')
    .delete()
    .eq('id', id)
  if (error) throw error
}
