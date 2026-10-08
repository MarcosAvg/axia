import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/shared/async-state'
import { usePriorities, useReasons, useTechnicians } from '@/features/catalogs'
import type { ReasonUse } from '@/features/catalogs'
import type { ActionKey } from '../domain/actions'
import { toTicketError } from '../domain/errors'
import { ticketMessages } from '../i18n'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { TicketActionFields } from './ticket-action-fields'
import type { ActionValues } from './ticket-action-fields'

type Mutations = ReturnType<typeof useTicketActions>
type MutateOptions = { onSuccess: () => void }

const REASON_USE_BY_ACTION: Partial<Record<ActionKey, ReasonUse>> = {
  pause: 'pause',
  reject: 'rejection',
  cancel: 'cancellation',
  open_claim: 'claim',
  resolve_claim: 'claim_outcome',
  reactivate: 'reactivation',
  add_auxiliary: 'auxiliary_support',
}

const EMPTY: ActionValues = {
  technicianId: '',
  reasonId: '',
  priorityId: '',
  note: '',
  text: '',
  resolution: 'upheld',
}

function mutationFor(action: ActionKey, actions: Mutations) {
  const map: Partial<Record<ActionKey, Mutations[keyof Mutations]>> = {
    assign_technician: actions.assignTechnician,
    attend: actions.attend,
    change_priority: actions.changePriority,
    comment: actions.comment,
    pause: actions.pause,
    reject: actions.reject,
    cancel: actions.cancel,
    open_claim: actions.openClaim,
    resolve_claim: actions.resolveClaim,
    reactivate: actions.reactivate,
    add_auxiliary: actions.addAuxiliary,
  }
  return map[action]
}

type Handlers = Partial<Record<ActionKey, () => void>>

function simpleHandlers(
  actions: Mutations,
  values: ActionValues,
  options: MutateOptions,
): Handlers {
  const note = values.note || null
  const text = values.text.trim()
  return {
    assign_technician: () => {
      if (values.technicianId) {
        actions.assignTechnician.mutate(
          { technicianId: values.technicianId },
          options,
        )
      }
    },
    attend: () => {
      if (text) actions.attend.mutate({ workDescription: text }, options)
    },
    change_priority: () => {
      if (values.priorityId) {
        actions.changePriority.mutate(
          { priorityId: values.priorityId },
          options,
        )
      }
    },
    comment: () => {
      if (text) actions.comment.mutate({ text }, options)
    },
    pause: () => {
      if (values.reasonId) {
        actions.pause.mutate({ reasonId: values.reasonId, note }, options)
      }
    },
    reject: () => {
      if (values.reasonId) {
        actions.reject.mutate({ reasonId: values.reasonId, note }, options)
      }
    },
    cancel: () => {
      if (values.reasonId) {
        actions.cancel.mutate({ reasonId: values.reasonId, note }, options)
      }
    },
  }
}

function claimHandlers(
  actions: Mutations,
  values: ActionValues,
  options: MutateOptions,
): Handlers {
  const note = values.note || null
  const text = values.text.trim()
  return {
    open_claim: () => {
      if (values.reasonId && text) {
        actions.openClaim.mutate(
          { reasonId: values.reasonId, description: text },
          options,
        )
      }
    },
    resolve_claim: () => {
      actions.resolveClaim.mutate(
        {
          resolution: values.resolution,
          resultId: values.reasonId || null,
          note,
        },
        options,
      )
    },
    reactivate: () => {
      if (values.reasonId) {
        actions.reactivate.mutate({ reasonId: values.reasonId }, options)
      }
    },
    add_auxiliary: () => {
      if (values.technicianId && values.reasonId) {
        actions.addAuxiliary.mutate(
          {
            technicianId: values.technicianId,
            reasonId: values.reasonId,
            note,
          },
          options,
        )
      }
    },
  }
}

function buildSubmitHandlers(
  actions: Mutations,
  values: ActionValues,
  options: MutateOptions,
): Handlers {
  return {
    ...simpleHandlers(actions, values, options),
    ...claimHandlers(actions, values, options),
  }
}

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

/** Formulario de una acción del tiquet, según lo que pida cada una. */
export function TicketActionForm({
  ticketId,
  action,
  subjectTechnicianId,
  onClose,
}: {
  ticketId: string
  action: ActionKey
  subjectTechnicianId?: string
  onClose: () => void
}) {
  const actions = useTicketActions(ticketId, subjectTechnicianId)
  const technicians = useTechnicians()
  const priorities = usePriorities()
  const reasons = useReasons(REASON_USE_BY_ACTION[action] ?? 'pause')
  const [values, setValues] = useState<ActionValues>(EMPTY)
  const mutation = mutationFor(action, actions)

  const onChange = (patch: Partial<ActionValues>) =>
    setValues((current) => ({ ...current, ...patch }))

  function submit(event: FormEvent) {
    event.preventDefault()
    buildSubmitHandlers(actions, values, { onSuccess: onClose })[action]?.()
  }

  if (!mutation) return null

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border p-4"
    >
      <TicketActionFields
        action={action}
        technicians={technicians.data ?? []}
        reasons={reasons.data ?? []}
        priorities={priorities.data ?? []}
        values={values}
        onChange={onChange}
      />
      <ActionFormFooter
        error={mutation.error}
        isPending={mutation.isPending}
        onClose={onClose}
      />
    </form>
  )
}
