import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addHoliday,
  addInterval,
  createCalendar,
  fetchCalendars,
  removeHoliday,
  removeInterval,
  updateCalendar,
} from '../api/calendar-api'
import type { CalendarInput, IntervalInput } from '../domain/calendar'
import { adminMessages } from '../i18n'

const calendarKeys = {
  list: ['admin', 'calendars'] as const,
}

function useInvalidateCalendars() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: calendarKeys.list })
  }
}

export function useCalendars() {
  return useQuery({ queryKey: calendarKeys.list, queryFn: fetchCalendars })
}

export function useCreateCalendar() {
  const invalidate = useInvalidateCalendars()
  return useMutation({
    mutationFn: (input: CalendarInput) => createCalendar(input),
    onSuccess: () => {
      invalidate()
      toast.success(adminMessages.actions.saved)
    },
    onError: () => toast.error(adminMessages.actions.error),
  })
}

export function useUpdateCalendar() {
  const invalidate = useInvalidateCalendars()
  return useMutation({
    mutationFn: (variables: { id: string; input: CalendarInput }) =>
      updateCalendar(variables.id, variables.input),
    onSuccess: () => {
      invalidate()
      toast.success(adminMessages.actions.saved)
    },
    onError: () => toast.error(adminMessages.actions.error),
  })
}

export function useAddInterval() {
  const invalidate = useInvalidateCalendars()
  return useMutation({
    mutationFn: (variables: { calendarId: string; input: IntervalInput }) =>
      addInterval(variables.calendarId, variables.input),
    onSuccess: invalidate,
  })
}

export function useRemoveInterval() {
  const invalidate = useInvalidateCalendars()
  return useMutation({
    mutationFn: (id: string) => removeInterval(id),
    onSuccess: invalidate,
  })
}

export function useAddHoliday() {
  const invalidate = useInvalidateCalendars()
  return useMutation({
    mutationFn: (variables: {
      calendarId: string
      holiday: string
      name: string | null
    }) => addHoliday(variables.calendarId, variables.holiday, variables.name),
    onSuccess: invalidate,
  })
}

export function useRemoveHoliday() {
  const invalidate = useInvalidateCalendars()
  return useMutation({
    mutationFn: (id: string) => removeHoliday(id),
    onSuccess: invalidate,
  })
}
