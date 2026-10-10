import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { z } from 'zod'
import { FormActionsBar } from '@/components/shared/form-actions-bar'
import { FormSection } from '@/components/shared/form-section'
import { Button } from '@/components/ui/button'
import { EVENT_TYPES } from '@/features/tickets'
import type { InstanceSettings } from '../domain/settings'
import { adminMessages } from '../i18n'
import {
  GeneralFields,
  TimeFields,
  ValidationFields,
  VisibilityFields,
} from './settings-fields'

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
  requesterVisibleEventTypes: z.array(z.enum(EVENT_TYPES)).min(1),
  defaultPriorityId: z.string().optional(),
})

type SettingsValues = z.infer<typeof schema>

function SettingsFormView({
  register,
  errors,
  isSaving,
  onSubmit,
}: {
  register: UseFormRegister<SettingsValues>
  errors: FieldErrors<SettingsValues>
  isSaving: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const { sections } = adminMessages.settings
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FormSection title={sections.general}>
        <GeneralFields register={register} errors={errors} />
      </FormSection>
      <FormSection title={sections.validation}>
        <ValidationFields register={register} errors={errors} />
      </FormSection>
      <FormSection title={sections.time}>
        <TimeFields register={register} errors={errors} />
      </FormSection>
      <FormSection title={sections.visibility}>
        <VisibilityFields register={register} errors={errors} />
      </FormSection>
      <FormActionsBar>
        <Button type="submit" disabled={isSaving} className="min-h-11">
          {isSaving ? adminMessages.actions.saving : adminMessages.actions.save}
        </Button>
      </FormActionsBar>
    </form>
  )
}

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
  } = useForm<SettingsValues>({
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
      requesterVisibleEventTypes: settings.requesterVisibleEventTypes,
      defaultPriorityId: settings.defaultPriorityId ?? '',
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
      requesterVisibleEventTypes: values.requesterVisibleEventTypes,
      defaultPriorityId: values.defaultPriorityId || null,
    })
  })

  return (
    <SettingsFormView
      register={register}
      errors={errors}
      isSaving={isSaving}
      onSubmit={onSubmit}
    />
  )
}
