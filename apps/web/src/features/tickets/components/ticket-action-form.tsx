import { useState } from 'react'
import type { FormEvent } from 'react'
import { FileField } from '@/components/shared/file-field'
import { TextField } from '@/components/shared/form-fields'
import type { ReasonOption, TechnicianOption } from '@/features/catalogs'
import { EMPTY_ACTION_VALUES, type ActionValues } from '../domain/action-values'
import type { ActionField } from '../domain/action-validation'
import type { ActionKey, ProxySubject } from '../domain/actions'
import { isProxyAction } from '../domain/actions'
import type {
  EvidenceType,
  TicketDetail,
  TicketPauseOption,
} from '../domain/types'
import { evidenceTypeLabels, ticketMessages } from '../i18n'
import { useActionCatalogs } from '../hooks/use-action-catalogs'
import { useActionTime } from '../hooks/use-action-time'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { useTicketPauseState } from '../hooks/use-tickets'
import { ActionFormFooter } from './action-form-footer'
import { TicketActionFields } from './ticket-action-fields'
import {
  actionFormState,
  mutationFor,
  reasonUseFor,
} from './ticket-action-handlers'
import { useActionSubmission } from './use-action-submission'

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

function ActionFormView({
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

/** Opciones de avance y salida del subestado actual de la pausa. */
function usePauseOptions(action: ActionKey, ticketId: string) {
  const needed = action === 'resume' || action === 'advance_pause'
  const state = useTicketPauseState(needed ? ticketId : undefined)
  return {
    advance: state.data?.advanceOptions ?? [],
    exit: state.data?.exitOptions ?? [],
  }
}

interface TicketActionFormProps {
  ticket: TicketDetail
  ticketId: string
  cycle: number
  action: ActionKey
  subject: ProxySubject
  excludeIds?: string[]
  onClose: () => void
}

function makeOnChange(
  clearValidation: () => void,
  setValues: (update: (current: ActionValues) => ActionValues) => void,
) {
  return (patch: Partial<ActionValues>) => {
    clearValidation()
    setValues((current) => ({ ...current, ...patch }))
  }
}

function useTicketActionForm({
  ticket,
  ticketId,
  cycle,
  action,
  subject,
  excludeIds,
  onClose,
}: TicketActionFormProps) {
  const subjectTechnicianId =
    subject?.kind === 'technician' ? subject.technicianId : undefined
  const time = useActionTime(
    isProxyAction(action) && Boolean(subjectTechnicianId),
  )
  const actions = useTicketActions(ticketId, subject, time.local)
  const pauseOptions = usePauseOptions(action, ticketId)
  const [values, setValues] = useState<ActionValues>(EMPTY_ACTION_VALUES)
  const catalogs = useActionCatalogs({
    action,
    reasonUse: reasonUseFor(action),
    ticket,
    values,
    excludeIds,
  })
  const submission = useActionSubmission({
    actions,
    values,
    action,
    ticketId,
    cycle,
    occurredLocal: time.local,
    subjectTechnicianId,
    reasonRequired: catalogs.reasonRequired,
    onClose,
  })
  const onChange = makeOnChange(submission.clearValidation, setValues)
  return {
    state: actionFormState(
      action,
      mutationFor(action, actions),
      submission.uploading,
    ),
    submission,
    values,
    onChange,
    occurredLocal: time.value,
    timezone: time.timezone,
    showOccurredAt: time.show,
    onOccurredAtChange: time.setValue,
    technicians: catalogs.technicians,
    reasons: catalogs.reasons,
    priorities: catalogs.priorities,
    serviceTypes: catalogs.serviceTypes,
    pauseOptions,
    reasonRequired: catalogs.reasonRequired,
  }
}

/** Formulario de una acción del tiquet; incluye la evidencia cuando la acción la exige. */
export function TicketActionForm(props: TicketActionFormProps) {
  const form = useTicketActionForm(props)
  if (!form.state.render) return null

  return (
    <ActionFormView
      evidenceType={form.submission.evidenceType}
      evidenceError={form.submission.evidenceError}
      evidenceFile={form.submission.file}
      onEvidenceChange={form.submission.setFile}
      action={props.action}
      technicians={form.technicians}
      reasons={form.reasons}
      priorities={form.priorities}
      serviceTypes={form.serviceTypes}
      pauseOptions={form.pauseOptions}
      categoryId={props.ticket.categoryId}
      reasonRequired={form.reasonRequired}
      values={form.values}
      validationErrors={form.submission.validationErrors}
      occurredLocal={form.occurredLocal}
      timezone={form.timezone}
      showOccurredAt={form.showOccurredAt}
      onOccurredAtChange={form.onOccurredAtChange}
      onChange={form.onChange}
      error={form.state.error}
      isPending={form.state.isPending}
      onSubmit={(event) => {
        void form.submission.submit(event)
      }}
      onClose={props.onClose}
    />
  )
}
