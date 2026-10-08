import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/shared/form-fields'
import type { CalendarInput, WorkCalendar } from '../domain/calendar'
import { adminMessages } from '../i18n'

const EMPTY: CalendarInput = {
  name: '',
  timezone: 'America/Mexico_City',
  active: true,
}

function initial(calendar?: WorkCalendar): CalendarInput {
  if (!calendar) return { ...EMPTY }
  return {
    name: calendar.name,
    timezone: calendar.timezone,
    active: calendar.active,
  }
}

function CalendarFields({
  values,
  error,
  onChange,
}: {
  values: CalendarInput
  error: string | null
  onChange: (patch: Partial<CalendarInput>) => void
}) {
  const { fields, settings } = adminMessages
  return (
    <>
      <TextField
        id="calendar-name"
        label={fields.name}
        value={values.name}
        error={error ?? undefined}
        onChange={(event) => onChange({ name: event.target.value })}
      />
      <TextField
        id="calendar-timezone"
        label={settings.timezone}
        value={values.timezone}
        onChange={(event) => onChange({ timezone: event.target.value })}
      />
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-5"
          checked={values.active}
          onChange={(event) => onChange({ active: event.target.checked })}
        />
        {fields.active}
      </label>
    </>
  )
}

/** Alta o edición de un calendario (nombre, zona horaria y estado). */
export function CalendarForm({
  calendar,
  isSaving,
  onSubmit,
  onCancel,
}: {
  calendar?: WorkCalendar
  isSaving: boolean
  onSubmit: (input: CalendarInput) => void
  onCancel?: () => void
}) {
  const { calendar: t, actions } = adminMessages
  const [values, setValues] = useState<CalendarInput>(() => initial(calendar))
  const [error, setError] = useState<string | null>(null)

  const patch = (next: Partial<CalendarInput>) =>
    setValues((current) => ({ ...current, ...next }))

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!values.name.trim() || !values.timezone.trim()) {
      setError(t.missing)
      return
    }
    setError(null)
    onSubmit({
      name: values.name.trim(),
      timezone: values.timezone.trim(),
      active: values.active,
    })
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border p-4"
    >
      <CalendarFields values={values} error={error} onChange={patch} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving} className="min-h-11">
          {isSaving ? actions.saving : actions.save}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={onCancel}
          >
            {actions.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
