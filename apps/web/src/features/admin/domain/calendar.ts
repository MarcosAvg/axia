// Tipos y funciones puras de los calendarios laborales (franjas semanales y festivos).

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const
export type Weekday = (typeof WEEKDAYS)[number]

export interface CalendarInterval {
  id: string
  weekday: number
  startTime: string
  endTime: string
}

export interface CalendarHoliday {
  id: string
  holiday: string
  name: string | null
}

export interface WorkCalendar {
  id: string
  name: string
  timezone: string
  active: boolean
  intervals: CalendarInterval[]
  holidays: CalendarHoliday[]
}

export interface CalendarInput {
  name: string
  timezone: string
  active: boolean
}

export interface IntervalInput {
  weekday: number
  startTime: string
  endTime: string
}

/** `HH:MM` a partir de un valor `time` de Postgres (`HH:MM:SS`). */
export function shortTime(value: string): string {
  return value.slice(0, 5)
}

/** El fin debe ser posterior al inicio el mismo día. */
export function isValidInterval(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return false
  return endTime > startTime
}

/** Franjas ordenadas por día y hora de inicio. */
export function sortIntervals(
  intervals: CalendarInterval[],
): CalendarInterval[] {
  return [...intervals].sort(
    (a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
  )
}

/** Festivos ordenados por fecha. */
export function sortHolidays(holidays: CalendarHoliday[]): CalendarHoliday[] {
  return [...holidays].sort((a, b) => a.holiday.localeCompare(b.holiday))
}
