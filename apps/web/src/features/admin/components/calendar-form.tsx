import { useState } from 'react'
import type { FormEvent } from 'react'
import { Switch } from '@/components/ui/switch'
import { TextField } from '@/components/shared/form-fields'
import type { CalendarInput, WorkCalendar } from '../domain/calendar'
import { adminMessages } from '../i18n'
import { EntityForm } from './entity-form'
import { FormGroup } from './form-group'

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

interface CalendarFormProps {
  calendar?: WorkCalendar
  isSaving: boolean
  onSubmit: (input: CalendarInput) => void
  onCancel: () => void
}

/** Alta o edición de un calendario (nombre, zona horaria y estado). */
export function CalendarForm({
  calendar,
  isSaving,
  onSubmit,
  onCancel,
}: CalendarFormProps) {
  const { calendar: t, fields, settings } = adminMessages
  const [values, setValues] = useState<CalendarInput>(() => initial(calendar))

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!values.name.trim() || !values.timezone.trim()) return
    onSubmit({
      name: values.name.trim(),
      timezone: values.timezone.trim(),
      active: values.active,
    })
  }

  return (
    <EntityForm onSubmit={submit} onCancel={onCancel} isSaving={isSaving}>
      <FormGroup title={t.details}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="calendar-name"
            label={fields.name}
            value={values.name}
            onChange={(event) =>
              setValues((current) => ({ ...current, name: event.target.value }))
            }
          />
          <TextField
            id="calendar-timezone"
            label={settings.timezone}
            value={values.timezone}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                timezone: event.target.value,
              }))
            }
          />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <Switch
            checked={values.active}
            aria-label={fields.active}
            onCheckedChange={(checked) =>
              setValues((current) => ({ ...current, active: checked }))
            }
          />
          {fields.active}
        </label>
      </FormGroup>
    </EntityForm>
  )
}
