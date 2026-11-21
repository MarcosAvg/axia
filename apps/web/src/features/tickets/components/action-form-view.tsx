import type { FormEvent } from 'react'
import { FileField } from '@/components/shared/file-field'
import { TextField } from '@/components/shared/form-fields'
import type { ReasonOption, TechnicianOption } from '@/features/catalogs'
import type { ActionValues } from '../domain/action-values'
import type { ActionField } from '../domain/action-validation'
import type { ActionKey } from '../domain/actions'
import type { EvidenceType, TicketPauseOption } from '../domain/types'
import { evidenceTypeLabels, ticketMessages } from '../i18n'
import { ActionFormFooter } from './action-form-footer'
import { TicketActionFields } from './ticket-action-fields'

function EvidenceBlock({
  evidenceType,
  evidenceError,
  evidenceFile,
  onEvidenceChange,
}: {
  evidenceType: EvidenceType | undefined
  evidenceError: string | null
  evidenceFile: File | null
  onEvidenceChange: (file: File | null) => void
}) {
  if (!evidenceType) return null
  return (
    <div className="flex flex-col gap-1">
      <FileField
        id="action-evidence"
        label={`${ticketMessages.actionFields.evidence}: ${evidenceTypeLabels[evidenceType]}`}
        file={evidenceFile}
        onChange={onEvidenceChange}
        accept="image/*,application/pdf"
        camera
      />
      {evidenceError ? (
        <p className="text-sm text-destructive">{evidenceError}</p>
      ) : null}
    </div>
  )
}

interface ActionFormViewProps {
  evidenceType: EvidenceType | undefined
  evidenceError: string | null
  evidenceFile: File | null
  onEvidenceChange: (file: File | null) => void
  action: ActionKey
  technicians: TechnicianOption[]
  reasons: ReasonOption[]
  priorities: { id: string; name: string }[]
  serviceTypes: { id: string; name: string }[]
  pauseOptions: {
    advance: TicketPauseOption[]
    exit: TicketPauseOption[]
  }
  categoryId: string
  reasonRequired: boolean
  values: ActionValues
  validationErrors: Partial<Record<ActionField, string>>
  occurredLocal: string
  timezone: string | null
  showOccurredAt: boolean
  onOccurredAtChange: (value: string) => void
  onChange: (patch: Partial<ActionValues>) => void
  error: unknown
  isPending: boolean
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}

function ActionTimeField({
  value,
  timezone,
  show,
  onChange,
}: {
  value: string
  timezone: string | null
  show: boolean
  onChange: (value: string) => void
}) {
  if (!show) return null
  return (
    <TextField
      id="action-occurred-at"
      label={ticketMessages.actionFields.realTime(timezone ?? 'instancia')}
      type="datetime-local"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export function ActionFormView({
  evidenceType,
  evidenceError,
  evidenceFile,
  onEvidenceChange,
  action,
  technicians,
  reasons,
  priorities,
  serviceTypes,
  pauseOptions,
  categoryId,
  reasonRequired,
  values,
  validationErrors,
  occurredLocal,
  timezone,
  showOccurredAt,
  onOccurredAtChange,
  onChange,
  error,
  isPending,
  onSubmit,
  onClose,
}: ActionFormViewProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <ActionTimeField
        value={occurredLocal}
        timezone={timezone}
        show={showOccurredAt}
        onChange={onOccurredAtChange}
      />
      <EvidenceBlock
        evidenceType={evidenceType}
        evidenceError={evidenceError}
        evidenceFile={evidenceFile}
        onEvidenceChange={onEvidenceChange}
      />
      <TicketActionFields
        action={action}
        technicians={technicians}
        reasons={reasons}
        priorities={priorities}
        serviceTypes={serviceTypes}
        pauseOptions={pauseOptions}
        categoryId={categoryId}
        reasonRequired={reasonRequired}
        values={values}
        errors={validationErrors}
        onChange={onChange}
      />
      <ActionFormFooter error={error} isPending={isPending} onClose={onClose} />
    </form>
  )
}
