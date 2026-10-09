import type { ReasonUse } from '@/features/catalogs'
import type { ActionKey } from '../domain/actions'
import type { useTicketActions } from '../hooks/use-ticket-actions'
import type { ActionValues } from './ticket-action-fields'

export type Mutations = ReturnType<typeof useTicketActions>
export type MutateOptions = { onSuccess: () => void }
export type Handlers = Partial<Record<ActionKey, () => void>>

/** Acciones que tienen su propio formulario dedicado. */
export const DEDICATED: ActionKey[] = [
  'recapture',
  'mark_duplicate',
  'assign_supervisor',
]

const REASON_USE_BY_ACTION: Partial<Record<ActionKey, ReasonUse>> = {
  pause: 'pause',
  reject: 'rejection',
  cancel: 'cancellation',
  open_claim: 'claim',
  resolve_claim: 'claim_outcome',
  reactivate: 'reactivation',
  add_auxiliary: 'auxiliary_support',
}

export const EMPTY: ActionValues = {
  technicianId: '',
  reasonId: '',
  priorityId: '',
  note: '',
  text: '',
  resolution: 'upheld',
}

export function reasonUseFor(action: ActionKey): ReasonUse {
  return REASON_USE_BY_ACTION[action] ?? 'pause'
}

/** Estado de vista del formulario: si se muestra y con qué error/pendiente. */
export function actionFormState(
  action: ActionKey,
  mutation: Mutations[keyof Mutations] | undefined,
  uploading: boolean,
): { render: boolean; error: unknown; isPending: boolean } {
  const isProgress = action === 'record_progress'
  return {
    render: Boolean(mutation) || isProgress,
    error: mutation ? mutation.error : null,
    isPending: (mutation ? mutation.isPending : false) || uploading,
  }
}

export function mutationFor(action: ActionKey, actions: Mutations) {
  const map: Partial<Record<ActionKey, Mutations[keyof Mutations]>> = {
    assign_technician: actions.assignTechnician,
    start: actions.start,
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
    start: () => actions.start.mutate({}, options),
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

export function buildSubmitHandlers(
  actions: Mutations,
  values: ActionValues,
  options: MutateOptions,
): Handlers {
  return {
    ...simpleHandlers(actions, values, options),
    ...claimHandlers(actions, values, options),
  }
}
