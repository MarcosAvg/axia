import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGrid } from '@/components/shared/button-grid'
import { ErrorAlert } from '@/components/shared/async-state'
import { FileField } from '@/components/shared/file-field'
import { TextField } from '@/components/shared/form-fields'
import {
  usePriorities,
  useReasons,
  useServiceTypes,
  useTechnicians,
} from '@/features/catalogs'
import type { ReasonOption, TechnicianOption } from '@/features/catalogs'
import { EMPTY_ACTION_VALUES, type ActionValues } from '../domain/action-values'
import type { ActionField } from '../domain/action-validation'
import type { ActionKey } from '../domain/actions'
import { isProxyAction } from '../domain/actions'
import { toTicketError } from '../domain/errors'
import type { EvidenceType } from '../domain/types'
import { evidenceTypeLabels, ticketMessages } from '../i18n'
import { useActionTime } from '../hooks/use-action-time'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { useTicketPauseState } from '../hooks/use-tickets'
import { TicketActionFields } from './ticket-action-fields'
import {
  actionFormState,
  mutationFor,
  reasonUseFor,
} from './ticket-action-handlers'
import { useActionSubmission } from './use-action-submission'

function ActionFormFooter({
  error,
  isPending,
  onClose,
}: {
  error: unknown
  isPending: boolean
  onClose: () => void
}) {
  return (
    <>
      {error ? <ErrorAlert message={toTicketError(error).message} /> : null}
      <ButtonGrid>
        <Button type="submit" disabled={isPending} className="min-h-11">
          {ticketMessages.actionFields.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={onClose}
        >
          {ticketMessages.actionFields.cancel}
        </Button>
      </ButtonGrid>
    </>
  )
}

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
  motiveReasonId: string | null
  values: ActionValues
  validationErrors: Partial<Record<ActionField, string>>
  occurredAt: string
  showOccurredAt: boolean
  onOccurredAtChange: (value: string) => void
  onChange: (patch: Partial<ActionValues>) => void
  error: unknown
  isPending: boolean
  onSubmit: (event: FormEvent) => void
  onClose: () => void
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
  motiveReasonId,
  values,
  validationErrors,
  occurredAt,
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
      {showOccurredAt ? (
        <TextField
          id="action-occurred-at"
          label="Hora real de la acción"
          type="datetime-local"
          value={occurredAt}
          onChange={(event) => onOccurredAtChange(event.target.value)}
        />
      ) : null}
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
        motiveReasonId={motiveReasonId}
        values={values}
        errors={validationErrors}
        onChange={onChange}
      />
      <ActionFormFooter error={error} isPending={isPending} onClose={onClose} />
    </form>
  )
}

function listTechnicians(
  data: TechnicianOption[] | undefined,
  action: ActionKey,
  excludeIds: string[] | undefined,
): TechnicianOption[] {
  const all = data ?? []
  if (action !== 'add_auxiliary' || !excludeIds) return all
  return all.filter((technician) => !excludeIds.includes(technician.id))
}

/** Motivo de la pausa abierta (para ofrecer sus subestados al reanudar y al gestionar). */
function usePauseMotiveReasonId(
  action: ActionKey,
  ticketId: string,
): string | null {
  const needed = action === 'resume' || action === 'advance_pause'
  const state = useTicketPauseState(needed ? ticketId : undefined)
  return state.data?.motiveId ?? null
}

interface TicketActionFormProps {
  ticketId: string
  cycle: number
  action: ActionKey
  subjectTechnicianId?: string
  excludeIds?: string[]
  onClose: () => void
}

function useTicketActionForm({
  ticketId,
  cycle,
  action,
  subjectTechnicianId,
  excludeIds,
  onClose,
}: TicketActionFormProps) {
  const time = useActionTime(
    isProxyAction(action) && Boolean(subjectTechnicianId),
  )
  const actions = useTicketActions(ticketId, subjectTechnicianId, time.iso)
  const technicians = useTechnicians()
  const priorities = usePriorities()
  const reasons = useReasons(reasonUseFor(action))
  const serviceTypes = useServiceTypes()
  const motiveReasonId = usePauseMotiveReasonId(action, ticketId)
  const [values, setValues] = useState<ActionValues>(EMPTY_ACTION_VALUES)
  const submission = useActionSubmission({
    actions,
    values,
    action,
    ticketId,
    cycle,
    occurredAt: time.iso,
    onClose,
  })
  const state = actionFormState(
    action,
    mutationFor(action, actions),
    submission.uploading,
  )
  const onChange = (patch: Partial<ActionValues>) => {
    submission.clearValidation()
    setValues((current) => ({ ...current, ...patch }))
  }
  return {
    state,
    submission,
    values,
    onChange,
    occurredAt: time.value,
    showOccurredAt: time.show,
    onOccurredAtChange: time.setValue,
    technicians: listTechnicians(technicians.data, action, excludeIds),
    reasons: reasons.data ?? [],
    priorities: priorities.data ?? [],
    serviceTypes: serviceTypes.data ?? [],
    motiveReasonId,
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
      motiveReasonId={form.motiveReasonId}
      values={form.values}
      validationErrors={form.submission.validationErrors}
      occurredAt={form.occurredAt}
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
