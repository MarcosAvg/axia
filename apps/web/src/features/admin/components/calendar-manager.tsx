import { useState } from 'react'
import { PencilIcon } from 'lucide-react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CalendarInput, WorkCalendar } from '../domain/calendar'
import {
  useCalendars,
  useCreateCalendar,
  useUpdateCalendar,
} from '../hooks/use-calendars'
import { adminMessages } from '../i18n'
import { CalendarForm } from './calendar-form'
import { CalendarHolidays } from './calendar-holidays'
import { CalendarIntervals } from './calendar-intervals'
import { EntityDialog } from './entity-dialog'

const t = adminMessages.calendar

function CalendarPicker({
  calendars,
  selectedId,
  onSelect,
  onCreate,
}: {
  calendars: WorkCalendar[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {calendars.map((calendar) => (
          <li key={calendar.id}>
            <Button
              type="button"
              variant={calendar.id === selectedId ? 'secondary' : 'ghost'}
              className="min-h-11 w-full justify-between"
              onClick={() => onSelect(calendar.id)}
            >
              <span className="truncate">{calendar.name}</span>
              {calendar.active ? null : (
                <Badge variant="outline">{adminMessages.list.inactive}</Badge>
              )}
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={onCreate}
      >
        {t.newTitle}
      </Button>
    </div>
  )
}

function CalendarDetail({
  calendar,
  onEdit,
}: {
  calendar: WorkCalendar
  onEdit: () => void
}) {
  const { list, actions, settings } = adminMessages
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{calendar.name}</h2>
          <Badge variant="secondary">
            {calendar.active ? list.active : list.inactive}
          </Badge>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={onEdit}
        >
          <PencilIcon />
          {actions.edit}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {settings.timezone}: {calendar.timezone}
      </p>
      <CalendarIntervals
        calendarId={calendar.id}
        intervals={calendar.intervals}
      />
      <CalendarHolidays calendarId={calendar.id} holidays={calendar.holidays} />
    </div>
  )
}

function CalendarDialog({
  calendar,
  isSaving,
  onSave,
  onClose,
}: {
  calendar?: WorkCalendar
  isSaving: boolean
  onSave: (input: CalendarInput) => void
  onClose: () => void
}) {
  return (
    <EntityDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={calendar ? t.editTitle : t.newTitle}
    >
      <CalendarForm
        calendar={calendar}
        isSaving={isSaving}
        onSubmit={onSave}
        onCancel={onClose}
      />
    </EntityDialog>
  )
}

type Editing = 'new' | WorkCalendar | null

function useCalendarManager() {
  const calendars = useCalendars()
  const create = useCreateCalendar()
  const update = useUpdateCalendar()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)

  const items = calendars.data ?? []
  const selected = items.find((item) => item.id === selectedId) ?? items[0]
  const isSaving = editing === 'new' ? create.isPending : update.isPending
  const editingCalendar =
    editing === 'new' || editing === null ? undefined : editing

  function save(input: CalendarInput) {
    const close = { onSuccess: () => setEditing(null) }
    if (editing === 'new' || editing === null) {
      create.mutate(input, close)
    } else {
      update.mutate({ id: editing.id, input }, close)
    }
  }

  return {
    calendars,
    items,
    selected,
    setSelectedId,
    editing,
    setEditing,
    isSaving,
    editingCalendar,
    save,
    close: () => setEditing(null),
  }
}

/** Administración de calendarios laborales, franjas y festivos. */
export function CalendarManager() {
  const c = useCalendarManager()
  const { list } = adminMessages

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t.help}</p>
      {c.calendars.isLoading ? <LoadingList rows={3} /> : null}
      {c.calendars.isError ? <ErrorAlert message={list.error} /> : null}
      {c.calendars.data && c.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{list.empty}</p>
      ) : null}
      {c.calendars.data && c.selected ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <CalendarPicker
            calendars={c.items}
            selectedId={c.selected.id}
            onSelect={c.setSelectedId}
            onCreate={() => c.setEditing('new')}
          />
          <CalendarDetail
            key={c.selected.id}
            calendar={c.selected}
            onEdit={() => c.setEditing(c.selected ?? null)}
          />
        </div>
      ) : null}
      {c.editing ? (
        <CalendarDialog
          calendar={c.editingCalendar}
          isSaving={c.isSaving}
          onSave={c.save}
          onClose={c.close}
        />
      ) : null}
    </div>
  )
}
