import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EMPTY_ACTION_VALUES, type ActionValues } from '../domain/action-values'
import type { ActionKey, ProxySubject } from '../domain/actions'
import { isProxyAction } from '../domain/actions'
import type { TicketDetail } from '../domain/types'
import { useActionCatalogs } from '../hooks/use-action-catalogs'
import { useActionTime } from '../hooks/use-action-time'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { usePendingTicketActions } from '../hooks/use-pending-actions'
import { useProjectedPause } from '../hooks/use-projected-pause'
import {
  actionFormState,
  mutationFor,
  reasonUseFor,
} from './ticket-action-handlers'
import { ActionFormView } from './action-form-view'
import { useActionSubmission } from './use-action-submission'
import { useFieldDraft } from './use-field-draft'

/** Opciones de avance y salida del subestado actual de la pausa. */
function usePauseOptions(action: ActionKey, ticketId: string) {
  const needed = action === 'resume' || action === 'advance_pause'
  const pauseTicket = needed ? ticketId : undefined
  const pending = usePendingTicketActions(pauseTicket)
  const state = useProjectedPause(pauseTicket, pending)
  return {
    advance: state?.advanceOptions ?? [],
    exit: state?.exitOptions ?? [],
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

function draftHandlersFor(
  values: ActionValues,
  setValues: (values: ActionValues) => void,
  draft: ReturnType<typeof useFieldDraft>,
  submission: ReturnType<typeof useActionSubmission>,
) {
  function onChange(patch: Partial<ActionValues>) {
    submission.clearValidation()
    const next = { ...values, ...patch }
    setValues(next)
    draft.save(next, submission.file)
  }
  function onEvidenceChange(file: File | null) {
    submission.setFile(file)
    draft.save(values, file)
  }
  function resumeDraft() {
    if (!draft.saved) return
    setValues(draft.saved.values)
    submission.setFile(draft.saved.photo)
    draft.resume()
  }
  return { onChange, onEvidenceChange, resumeDraft }
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
  const draft = useFieldDraft(ticketId, cycle, action, subject)
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
    onClose: () => {
      void draft.clear().then(onClose)
    },
  })
  return {
    state: actionFormState(
      action,
      mutationFor(action, actions),
      submission.uploading,
    ),
    submission,
    draft,
    ...draftHandlersFor(values, setValues, draft, submission),
    values,
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

function DraftPrompt({
  form,
}: {
  form: ReturnType<typeof useTicketActionForm>
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="w-full text-sm">
        Tienes un borrador guardado en este dispositivo.
      </p>
      <Button type="button" size="sm" onClick={form.resumeDraft}>
        Retomar borrador
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => void form.draft.clear()}
      >
        Descartar borrador
      </Button>
      {form.draft.error ? (
        <p role="alert">No se pudo actualizar el borrador local.</p>
      ) : null}
    </div>
  )
}

/** Formulario de una acción del tiquet; incluye la evidencia cuando la acción la exige. */
export function TicketActionForm(props: TicketActionFormProps) {
  const form = useTicketActionForm(props)
  if (!form.state.render) return null
  if (form.draft.loading)
    return <p role="status">Buscando un borrador guardado…</p>

  if (form.draft.saved) return <DraftPrompt form={form} />
  return (
    <>
      {form.draft.error ? (
        <p role="alert" className="text-sm text-destructive">
          No se pudo guardar el borrador en este dispositivo.
        </p>
      ) : null}
      <ActionFormView
        evidenceType={form.submission.evidenceType}
        evidenceError={form.submission.evidenceError}
        evidenceFile={form.submission.file}
        onEvidenceChange={form.onEvidenceChange}
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
    </>
  )
}
