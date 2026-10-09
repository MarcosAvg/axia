import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/shared/async-state'
import { FileField } from '@/components/shared/file-field'
import { usePriorities, useReasons, useTechnicians } from '@/features/catalogs'
import type { ReasonOption, TechnicianOption } from '@/features/catalogs'
import type { ActionKey } from '../domain/actions'
import { toTicketError } from '../domain/errors'
import type { EvidenceType } from '../domain/types'
import { evidenceTypeLabels, ticketMessages } from '../i18n'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { TicketActionFields } from './ticket-action-fields'
import type { ActionValues } from './ticket-action-fields'
import {
  EMPTY,
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
      <div className="flex flex-wrap gap-2">
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
      </div>
    </>
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
  values,
  onChange,
  error,
  isPending,
  onSubmit,
  onClose,
}: {
  evidenceType: EvidenceType | undefined
  evidenceError: string | null
  evidenceFile: File | null
  onEvidenceChange: (file: File | null) => void
  action: ActionKey
  technicians: TechnicianOption[]
  reasons: ReasonOption[]
  priorities: { id: string; name: string }[]
  values: ActionValues
  onChange: (patch: Partial<ActionValues>) => void
  error: unknown
  isPending: boolean
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {evidenceType ? (
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
      ) : null}
      <TicketActionFields
        action={action}
        technicians={technicians}
        reasons={reasons}
        priorities={priorities}
        values={values}
        onChange={onChange}
      />
      <ActionFormFooter error={error} isPending={isPending} onClose={onClose} />
    </form>
  )
}

/** Formulario de una acción del tiquet; incluye la evidencia cuando la acción la exige. */
export function TicketActionForm({
  ticketId,
  cycle,
  action,
  subjectTechnicianId,
  onClose,
}: {
  ticketId: string
  cycle: number
  action: ActionKey
  subjectTechnicianId?: string
  onClose: () => void
}) {
  const actions = useTicketActions(ticketId, subjectTechnicianId)
  const technicians = useTechnicians()
  const priorities = usePriorities()
  const reasons = useReasons(reasonUseFor(action))
  const [values, setValues] = useState<ActionValues>(EMPTY)
  const mutation = mutationFor(action, actions)
  const submission = useActionSubmission({
    actions,
    values,
    action,
    ticketId,
    cycle,
    onClose,
  })

  const state = actionFormState(action, mutation, submission.uploading)
  if (!state.render) return null

  const onChange = (patch: Partial<ActionValues>) =>
    setValues((current) => ({ ...current, ...patch }))

  return (
    <ActionFormView
      evidenceType={submission.evidenceType}
      evidenceError={submission.evidenceError}
      evidenceFile={submission.file}
      onEvidenceChange={submission.setFile}
      action={action}
      technicians={technicians.data ?? []}
      reasons={reasons.data ?? []}
      priorities={priorities.data ?? []}
      values={values}
      onChange={onChange}
      error={state.error}
      isPending={state.isPending}
      onSubmit={(event) => {
        void submission.submit(event)
      }}
      onClose={onClose}
    />
  )
}
