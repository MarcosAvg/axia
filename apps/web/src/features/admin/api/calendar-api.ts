import { apiFetch } from '@/lib/api-client'
import type {
  CalendarInput,
  IntervalInput,
  WorkCalendar,
} from '../domain/calendar'

type CalendarResponse = WorkCalendar

export async function fetchCalendars(): Promise<WorkCalendar[]> {
  const body = await apiFetch<{ items: CalendarResponse[] }>(
    '/api/admin/calendars',
  )
  return body.items
}

export async function createCalendar(input: CalendarInput): Promise<void> {
  await apiFetch('/api/admin/calendars', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateCalendar(
  id: string,
  input: CalendarInput,
): Promise<void> {
  await apiFetch(`/api/admin/calendars/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function addInterval(
  calendarId: string,
  input: IntervalInput,
): Promise<void> {
  await apiFetch(`/api/admin/calendars/${calendarId}/intervals`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function removeInterval(id: string): Promise<void> {
  await apiFetch(`/api/admin/calendar-intervals/${id}`, { method: 'DELETE' })
}

export async function addHoliday(
  calendarId: string,
  holiday: string,
  name: string | null,
): Promise<void> {
  await apiFetch(`/api/admin/calendars/${calendarId}/holidays`, {
    method: 'POST',
    body: JSON.stringify({ holiday, name }),
  })
}

export async function removeHoliday(id: string): Promise<void> {
  await apiFetch(`/api/admin/calendar-holidays/${id}`, { method: 'DELETE' })
}
