import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { WEEKDAYS, isValidInterval } from '../domain/calendar'
import type { CalendarInterval } from '../domain/calendar'
import { useAddInterval, useRemoveInterval } from '../hooks/use-calendars'
import { adminMessages } from '../i18n'

const t = adminMessages.calendar
const weekdays = adminMessages.weekdays as Record<number, string>
const weekdayOptions = WEEKDAYS.map((day) => ({
  value: String(day),
  label: weekdays[day] ?? '',
}))

function dayLabel(weekday: number): string {
  return weekdays[weekday] ?? ''
}

function IntervalRow({
  interval,
  onRemove,
}: {
  interval: CalendarInterval
  onRemove: (id: string) => void
}) {
  return (
    <li className="flex min-h-11 flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">{dayLabel(interval.weekday)}</span>
      <span className="text-muted-foreground">
        {interval.startTime}–{interval.endTime}
      </span>
      <Button
        type="button"
        variant="ghost"
        className="min-h-11"
        onClick={() => onRemove(interval.id)}
      >
        {t.remove}
      </Button>
    </li>
  )
}

function AddIntervalForm({ calendarId }: { calendarId: string }) {
  const add = useAddInterval()
  const [weekday, setWeekday] = useState('1')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!isValidInterval(startTime, endTime)) {
      setError(t.invalidInterval)
      return
    }
    setError(null)
    add.mutate({
      calendarId,
      input: { weekday: Number(weekday), startTime, endTime },
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="w-40">
        <SelectField
          id="interval-weekday"
          label={t.day}
          options={weekdayOptions}
          value={weekday}
          onChange={(event) => setWeekday(event.target.value)}
        />
      </div>
      <div className="w-32">
        <TextField
          id="interval-start"
          label={t.start}
          type="time"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
        />
      </div>
      <div className="w-32">
        <TextField
          id="interval-end"
          label={t.end}
          type="time"
          value={endTime}
          error={error ?? undefined}
          onChange={(event) => setEndTime(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={add.isPending} className="min-h-11">
        {t.addInterval}
      </Button>
    </form>
  )
}

/** Franjas semanales de un calendario. */
export function CalendarIntervals({
  calendarId,
  intervals,
}: {
  calendarId: string
  intervals: CalendarInterval[]
}) {
  const remove = useRemoveInterval()
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">{t.intervals}</h3>
      {intervals.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noIntervals}</p>
      ) : (
        <ul className="flex flex-col">
          {intervals.map((interval) => (
            <IntervalRow
              key={interval.id}
              interval={interval}
              onRemove={(id) => remove.mutate(id)}
            />
          ))}
        </ul>
      )}
      <AddIntervalForm calendarId={calendarId} />
    </section>
  )
}
