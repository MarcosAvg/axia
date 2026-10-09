import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { SelectField, TextField } from '@/components/shared/form-fields'
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
        {...register('timezone')}
      />
      <TextField
        id="settings-folio"
        label={settings.folioPattern}
        error={errors.folioPattern?.message}
        {...register('folioPattern')}
      />
    </div>
  )
}

/** Política de validación y evidencia. */
export function ValidationFields({ register, errors }: SettingsFieldsProps) {
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
