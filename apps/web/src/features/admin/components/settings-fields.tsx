import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { usePriorities } from '@/features/catalogs'
import { EVENT_TYPES, eventLabels } from '@/features/tickets'
import { useCalendars } from '../hooks/use-calendars'
import type { SettingsFormValues } from '../domain/settings'
import { adminMessages } from '../i18n'

interface SettingsFieldsProps {
  register: UseFormRegister<SettingsFormValues>
  errors: FieldErrors<SettingsFormValues>
}

const { settings, validationPolicies, evidencePolicies } = adminMessages

const validationOptions = (
  Object.keys(validationPolicies) as (keyof typeof validationPolicies)[]
).map((value) => ({ value, label: validationPolicies[value] }))
const evidenceOptions = (
  Object.keys(evidencePolicies) as (keyof typeof evidencePolicies)[]
).map((value) => ({ value, label: evidencePolicies[value] }))
const slaClockModes = adminMessages.slaClockModes
const slaClockOptions = (
  Object.keys(slaClockModes) as (keyof typeof slaClockModes)[]
).map((value) => ({ value, label: slaClockModes[value] }))

const TIMEZONES = [
  'America/Mexico_City',
  'America/Monterrey',
  'America/Cancun',
  'America/Tijuana',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'UTC',
]

/** Campos generales de la instancia. */
export function GeneralFields({ register, errors }: SettingsFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        id="settings-team-label"
        label={settings.teamLabel}
        error={errors.teamLabel?.message}
        {...register('teamLabel')}
      />
      <TextField
        id="settings-timezone"
        label={settings.timezone}
        error={errors.timezone?.message}
        list="settings-timezones"
        {...register('timezone')}
      />
      <datalist id="settings-timezones">
        {TIMEZONES.map((timezone) => (
          <option key={timezone} value={timezone} />
        ))}
      </datalist>
      <div className="flex flex-col gap-1">
        <TextField
          id="settings-folio"
          label={settings.folioPattern}
          error={errors.folioPattern?.message}
          {...register('folioPattern')}
        />
        <p className="text-xs text-muted-foreground">{settings.folioExample}</p>
      </div>
    </div>
  )
}

/** Política de validación y evidencia. */
export function ValidationFields({ register, errors }: SettingsFieldsProps) {
  const priorities = usePriorities()
  const priorityOptions = (priorities.data ?? []).map((priority) => ({
    value: priority.id,
    label: priority.name,
  }))
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        id="settings-validation"
        label={settings.validationPolicy}
        options={validationOptions}
        error={errors.validationPolicy?.message}
        {...register('validationPolicy')}
      />
      <TextField
        id="settings-auto-days"
        type="number"
        label={settings.autoValidationDays}
        error={errors.autoValidationDays?.message}
        {...register('autoValidationDays')}
      />
      <TextField
        id="settings-claim-days"
        type="number"
        label={settings.claimWindowDays}
        error={errors.claimWindowDays?.message}
        {...register('claimWindowDays')}
      />
      <SelectField
        id="settings-evidence"
        label={settings.evidencePolicy}
        options={evidenceOptions}
        error={errors.requestEvidencePolicy?.message}
        {...register('requestEvidencePolicy')}
      />
      <SelectField
        id="settings-default-priority"
        label={settings.defaultPriority}
        placeholder={adminMessages.actions.selectPlaceholder}
        options={priorityOptions}
        error={errors.defaultPriorityId?.message}
        {...register('defaultPriorityId')}
      />
    </div>
  )
}

/** Calendario por defecto y modo de reloj. */
export function TimeFields({ register, errors }: SettingsFieldsProps) {
  const calendars = useCalendars()
  const options = (calendars.data ?? []).map((calendar) => ({
    value: calendar.id,
    label: calendar.name,
  }))
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        id="settings-default-calendar"
        label={settings.defaultCalendar}
        placeholder={adminMessages.actions.selectPlaceholder}
        options={options}
        error={errors.defaultCalendarId?.message}
        {...register('defaultCalendarId')}
      />
      <SelectField
        id="settings-sla-clock"
        label={settings.slaClockMode}
        options={slaClockOptions}
        error={errors.slaClockMode?.message}
        {...register('slaClockMode')}
      />
    </div>
  )
}

/** Tipos de evento que el solicitante ve en la línea de tiempo (RN-23). */
export function VisibilityFields({ register, errors }: SettingsFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">
        {settings.requesterVisibleEvents}
      </span>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {EVENT_TYPES.map((type) => (
          <label key={type} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              value={type}
              className="size-4 rounded border-input accent-primary"
              {...register('requesterVisibleEventTypes')}
            />
            {eventLabels[type]}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {settings.requesterVisibleEventsHelp}
      </p>
      {errors.requesterVisibleEventTypes ? (
        <p className="text-sm text-destructive">
          {settings.requesterVisibleEventsError}
        </p>
      ) : null}
    </div>
  )
}
