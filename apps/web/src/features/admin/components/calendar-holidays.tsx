import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/shared/form-fields'
import type { CalendarHoliday } from '../domain/calendar'
import { useAddHoliday, useRemoveHoliday } from '../hooks/use-calendars'
import { adminMessages } from '../i18n'

const t = adminMessages.calendar

function HolidayRow({
  holiday,
  onRemove,
}: {
  holiday: CalendarHoliday
  onRemove: (id: string) => void
}) {
  return (
    <li className="flex min-h-11 flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">{holiday.holiday}</span>
      {holiday.name ? (
        <span className="text-muted-foreground">{holiday.name}</span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className="min-h-11"
        onClick={() => onRemove(holiday.id)}
      >
        {t.remove}
      </Button>
    </li>
  )
}

function AddHolidayForm({ calendarId }: { calendarId: string }) {
  const add = useAddHoliday()
  const [holiday, setHoliday] = useState('')
  const [name, setName] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!holiday) return
    add.mutate(
      { calendarId, holiday, name: name.trim() || null },
      { onSuccess: () => setHoliday('') },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="w-44">
        <TextField
          id="holiday-date"
          label={t.holiday}
          type="date"
          value={holiday}
          onChange={(event) => setHoliday(event.target.value)}
        />
      </div>
      <div className="w-56">
        <TextField
          id="holiday-name"
          label={t.holidayName}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <Button
        type="submit"
        disabled={add.isPending || !holiday}
        className="min-h-11"
      >
        {t.addHoliday}
      </Button>
    </form>
  )
}

/** Días no laborables de un calendario. */
export function CalendarHolidays({
  calendarId,
  holidays,
}: {
  calendarId: string
  holidays: CalendarHoliday[]
}) {
  const remove = useRemoveHoliday()
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">{t.holidays}</h3>
      {holidays.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noHolidays}</p>
      ) : (
        <ul className="flex flex-col">
          {holidays.map((holiday) => (
            <HolidayRow
              key={holiday.id}
              holiday={holiday}
              onRemove={(id) => remove.mutate(id)}
            />
          ))}
        </ul>
      )}
      <AddHolidayForm calendarId={calendarId} />
    </section>
  )
}
