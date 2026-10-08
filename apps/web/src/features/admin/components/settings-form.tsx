import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import type { InstanceSettings } from '../domain/settings'
import { adminMessages } from '../i18n'
import { SettingsFields } from './settings-fields'

const schema = z.object({
  teamLabel: z.string().trim().min(1),
  validationPolicy: z.enum(['requester', 'supervisor', 'both']),
  autoValidationDays: z.string().optional(),
  claimWindowDays: z.string().regex(/^\d+$/),
  requestEvidencePolicy: z.enum(['optional', 'recommended', 'required']),
  folioPattern: z.string().trim().min(1),
  timezone: z.string().trim().min(1),
  defaultCalendarId: z.string().optional(),
  slaClockMode: z.enum(['calendar', 'laboral']),
})

interface SettingsFormProps {
  settings: InstanceSettings
  isSaving: boolean
  onSave: (settings: InstanceSettings) => void
}

/** Formulario de la configuración esencial de la instancia. */
export function SettingsForm({
  settings,
  isSaving,
  onSave,
}: SettingsFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      teamLabel: settings.teamLabel,
      validationPolicy: settings.validationPolicy,
      autoValidationDays:
        settings.autoValidationDays === null
          ? ''
          : String(settings.autoValidationDays),
      claimWindowDays: String(settings.claimWindowDays),
      requestEvidencePolicy: settings.requestEvidencePolicy,
      folioPattern: settings.folioPattern,
      timezone: settings.timezone,
      defaultCalendarId: settings.defaultCalendarId ?? '',
      slaClockMode: settings.slaClockMode,
    },
  })

  const onSubmit = handleSubmit((values) => {
    onSave({
      teamLabel: values.teamLabel,
      validationPolicy: values.validationPolicy,
      autoValidationDays: values.autoValidationDays
        ? Number(values.autoValidationDays)
        : null,
      claimWindowDays: Number(values.claimWindowDays),
      requestEvidencePolicy: values.requestEvidencePolicy,
      folioPattern: values.folioPattern,
      timezone: values.timezone,
      defaultCalendarId: values.defaultCalendarId || null,
      slaClockMode: values.slaClockMode,
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <SettingsFields register={register} errors={errors} />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSaving} className="min-h-11">
          {isSaving ? adminMessages.actions.saving : adminMessages.actions.save}
        </Button>
      </div>
    </form>
  )
}
