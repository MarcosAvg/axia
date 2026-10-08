import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { SelectField, TextField } from '@/components/shared/form-fields'
import type { SettingsFormValues } from '../domain/settings'
import { adminMessages } from '../i18n'

interface SettingsFieldsProps {
  register: UseFormRegister<SettingsFormValues>
  errors: FieldErrors<SettingsFormValues>
}

/** Campos del formulario de configuración. */
export function SettingsFields({ register, errors }: SettingsFieldsProps) {
  const { settings, validationPolicies, evidencePolicies } = adminMessages

  const validationOptions = (
    Object.keys(validationPolicies) as (keyof typeof validationPolicies)[]
  ).map((value) => ({ value, label: validationPolicies[value] }))
  const evidenceOptions = (
    Object.keys(evidencePolicies) as (keyof typeof evidencePolicies)[]
  ).map((value) => ({ value, label: evidencePolicies[value] }))

  return (
    <>
      <TextField
        id="settings-team-label"
        label={settings.teamLabel}
        error={errors.teamLabel?.message}
        {...register('teamLabel')}
      />
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
      <TextField
        id="settings-folio"
        label={settings.folioPattern}
        error={errors.folioPattern?.message}
        {...register('folioPattern')}
      />
      <TextField
        id="settings-timezone"
        label={settings.timezone}
        error={errors.timezone?.message}
        {...register('timezone')}
      />
    </>
  )
}
