import { useState } from 'react'
import type { FormEvent } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { sortHolidays } from '../domain/calendar'
import type { CalendarHoliday } from '../domain/calendar'
import { useAddHoliday, useRemoveHoliday } from '../hooks/use-calendars'
import { adminMessages } from '../i18n'
import { EntityDialog } from './entity-dialog'
import { EntityForm } from './entity-form'
import { FormGroup } from './form-group'

const t = adminMessages.calendar

function buildHolidayColumns(
  onRemove: (holiday: CalendarHoliday) => void,
): DataTableColumn<CalendarHoliday>[] {
  return [
    {
      id: 'holiday',
      header: t.holiday,
      sortable: true,
      cell: (holiday) => <span className="font-medium">{holiday.holiday}</span>,
    },
    {
      id: 'name',
      header: t.holidayName,
      cell: (holiday) =>
        holiday.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      className: 'w-14',
      cell: (holiday) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${t.remove}: ${holiday.holiday}`}
            onClick={() => onRemove(holiday)}
          >
            <TrashIcon />
          </Button>
        </div>
      ),
    },
  ]
}

function HolidayDialog({
  isSaving,
  onAdd,
  onClose,
}: {
  isSaving: boolean
  onAdd: (holiday: string, name: string | null) => void
  onClose: () => void
}) {
  const [holiday, setHoliday] = useState('')
  const [name, setName] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!holiday) return
    onAdd(holiday, name.trim() || null)
  }

  return (
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={t.addHoliday}
    >
      <EntityForm
        onSubmit={submit}
        onCancel={onClose}
        isSaving={isSaving}
        submitLabel={adminMessages.actions.add}
      >
        <FormGroup title={t.holidays}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="holiday-date"
              label={t.holiday}
              type="date"
              value={holiday}
              onChange={(event) => setHoliday(event.target.value)}
            />
            <TextField
              id="holiday-name"
              label={t.holidayName}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </FormGroup>
      </EntityForm>
    </EntityDialog>
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
  const add = useAddHoliday()
  const remove = useRemoveHoliday()
  const [adding, setAdding] = useState(false)
  const rows = sortHolidays(holidays)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{t.holidays}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
        >
          <PlusIcon />
          {t.addHoliday}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noHolidays}</p>
      ) : (
        <DataTable
          columns={buildHolidayColumns((holiday) => remove.mutate(holiday.id))}
          rows={rows}
          getRowId={(row) => row.id}
        />
      )}
      {adding ? (
        <HolidayDialog
          isSaving={add.isPending}
          onAdd={(holiday, name) =>
            add.mutate(
              { calendarId, holiday, name },
              { onSuccess: () => setAdding(false) },
            )
          }
          onClose={() => setAdding(false)}
        />
      ) : null}
    </section>
  )
}
