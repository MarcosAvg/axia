import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import type { WorkCalendar } from '../domain/calendar'
import {
  useCalendars,
  useCreateCalendar,
  useUpdateCalendar,
} from '../hooks/use-calendars'
import { adminMessages } from '../i18n'
import { CalendarForm } from './calendar-form'
import { CalendarHolidays } from './calendar-holidays'
import { CalendarIntervals } from './calendar-intervals'

const t = adminMessages.calendar

function CalendarPicker({
  calendars,
  selectedId,
  onSelect,
}: {
  calendars: WorkCalendar[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <ul className="flex flex-col gap-1">
      {calendars.map((calendar) => (
        <li key={calendar.id}>
          <Button
            type="button"
            variant={calendar.id === selectedId ? 'secondary' : 'ghost'}
            className="min-h-11 w-full justify-start"
            onClick={() => onSelect(calendar.id)}
          >
            {calendar.name}
            {calendar.active ? '' : ` · ${adminMessages.list.inactive}`}
          </Button>
        </li>
      ))}
    </ul>
  )
}

function CalendarDetail({ calendar }: { calendar: WorkCalendar }) {
  const update = useUpdateCalendar()
  return (
    <div className="flex flex-col gap-6">
      <CalendarForm
        key={calendar.id}
        calendar={calendar}
        isSaving={update.isPending}
        onSubmit={(input) => update.mutate({ id: calendar.id, input })}
      />
      <CalendarIntervals
        calendarId={calendar.id}
        intervals={calendar.intervals}
      />
      <CalendarHolidays calendarId={calendar.id} holidays={calendar.holidays} />
    </div>
  )
}

function CalendarStatus({
  isLoading,
  isError,
}: {
  isLoading: boolean
  isError: boolean
}) {
  if (isLoading) {
    return <LoadingList rows={3} />
  }
  if (isError) {
    return <ErrorAlert message={adminMessages.list.error} />
  }
  return null
}

/** Administración de calendarios laborales, franjas y festivos. */
export function CalendarManager() {
  const calendars = useCalendars()
  const create = useCreateCalendar()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const items = calendars.data ?? []
  const selected = items.find((item) => item.id === selectedId) ?? items[0]

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t.help}</p>
      <CalendarStatus
        isLoading={calendars.isLoading}
        isError={calendars.isError}
      />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="flex flex-col gap-2">
          <CalendarPicker
            calendars={items}
            selectedId={selected?.id ?? null}
            onSelect={(id) => {
              setCreating(false)
              setSelectedId(id)
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setCreating(true)}
          >
            {t.newTitle}
          </Button>
        </div>
        <div className="flex flex-col gap-6">
          {creating ? (
            <CalendarForm
              isSaving={create.isPending}
              onSubmit={(input) =>
                create.mutate(input, { onSuccess: () => setCreating(false) })
              }
              onCancel={() => setCreating(false)}
            />
          ) : selected ? (
            <CalendarDetail calendar={selected} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {adminMessages.list.empty}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
