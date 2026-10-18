import { useState } from 'react'
import type { FormEvent } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { WEEKDAYS, isValidInterval, sortIntervals } from '../domain/calendar'
import type { CalendarInterval, IntervalInput } from '../domain/calendar'
import { useAddInterval, useRemoveInterval } from '../hooks/use-calendars'
import { adminMessages } from '../i18n'
import { EntityDialog } from './entity-dialog'
import { EntityForm } from './entity-form'
import { FormGroup } from './form-group'

const t = adminMessages.calendar
const weekdays = adminMessages.weekdays as Record<number, string>
const weekdayOptions = WEEKDAYS.map((day) => ({
  value: String(day),
  label: weekdays[day] ?? '',
}))

function dayLabel(weekday: number): string {
  return weekdays[weekday] ?? ''
}

function buildIntervalColumns(
  onRemove: (interval: CalendarInterval) => void,
): DataTableColumn<CalendarInterval>[] {
  return [
    {
      id: 'weekday',
      header: t.day,
      sortable: true,
      cell: (interval) => dayLabel(interval.weekday),
    },
    {
      id: 'start',
      header: t.start,
      align: 'right',
      cell: (interval) => interval.startTime,
    },
    {
      id: 'end',
      header: t.end,
      align: 'right',
      cell: (interval) => interval.endTime,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      className: 'w-14',
      cell: (interval) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${t.remove}: ${dayLabel(interval.weekday)} ${interval.startTime}-${interval.endTime}`}
            onClick={() => onRemove(interval)}
          >
            <TrashIcon />
          </Button>
        </div>
      ),
    },
  ]
}

interface IntervalFieldsProps {
  weekday: string
  startTime: string
  endTime: string
  error: string | null
  onWeekday: (value: string) => void
  onStart: (value: string) => void
  onEnd: (value: string) => void
}

function IntervalFields(props: IntervalFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SelectField
        id="interval-weekday"
        label={t.day}
        options={weekdayOptions}
        value={props.weekday}
        onChange={(event) => props.onWeekday(event.target.value)}
      />
      <TextField
        id="interval-start"
        label={t.start}
        type="time"
        value={props.startTime}
        onChange={(event) => props.onStart(event.target.value)}
      />
      <TextField
        id="interval-end"
        label={t.end}
        type="time"
        value={props.endTime}
        error={props.error ?? undefined}
        onChange={(event) => props.onEnd(event.target.value)}
      />
    </div>
  )
}

function IntervalDialog({
  isSaving,
  onAdd,
  onClose,
}: {
  isSaving: boolean
  onAdd: (input: IntervalInput) => void
  onClose: () => void
}) {
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
    onAdd({ weekday: Number(weekday), startTime, endTime })
  }

  return (
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={t.addInterval}
    >
      <EntityForm
        onSubmit={submit}
        onCancel={onClose}
        isSaving={isSaving}
        submitLabel={adminMessages.actions.add}
      >
        <FormGroup title={t.intervals}>
          <IntervalFields
            weekday={weekday}
            startTime={startTime}
            endTime={endTime}
            error={error}
            onWeekday={setWeekday}
            onStart={setStartTime}
            onEnd={setEndTime}
          />
        </FormGroup>
      </EntityForm>
    </EntityDialog>
  )
}

function IntervalRemoveDialog({
  interval,
  isPending,
  onConfirm,
  onClose,
}: {
  interval: CalendarInterval | null
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!interval) return null
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Quitar franja semanal"
      description={`Se quitará ${dayLabel(interval.weekday)} de ${interval.startTime} a ${interval.endTime}.`}
      confirmLabel="Quitar franja"
      destructive
      isPending={isPending}
      onConfirm={onConfirm}
    />
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
  const add = useAddInterval()
  const remove = useRemoveInterval()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<CalendarInterval | null>(null)
  const rows = sortIntervals(intervals)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{t.intervals}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
        >
          <PlusIcon />
          {t.addInterval}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noIntervals}</p>
      ) : (
        <DataTable
          columns={buildIntervalColumns(setRemoving)}
          rows={rows}
          getRowId={(row) => row.id}
        />
      )}
      <IntervalRemoveDialog
        interval={removing}
        isPending={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return
          remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })
        }}
      />
      {adding ? (
        <IntervalDialog
          isSaving={add.isPending}
          onAdd={(input) =>
            add.mutate(
              { calendarId, input },
              { onSuccess: () => setAdding(false) },
            )
          }
          onClose={() => setAdding(false)}
        />
      ) : null}
    </section>
  )
}
