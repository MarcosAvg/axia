import type { ReasonUse } from '@/features/catalogs'
import type { ActionValues } from '../domain/action-values'
import type { ActionKey } from '../domain/actions'
import type { useTicketActions } from '../hooks/use-ticket-actions'

export type Mutations = ReturnType<typeof useTicketActions>
export type Handlers = Partial<
  Record<ActionKey, () => Promise<void> | undefined>
>

/** Acciones que tienen su propio formulario dedicado. */
export const DEDICATED: ActionKey[] = [
  'recapture',
  'mark_duplicate',
  'assign_supervisor',
]

const REASON_USE_BY_ACTION: Partial<Record<ActionKey, ReasonUse>> = {
  pause: 'pause',
  advance_pause: 'pause',
  reject: 'rejection',
  cancel: 'cancellation',
  open_claim: 'claim',
  resolve_claim: 'claim_outcome',
  reactivate: 'reactivation',
  add_auxiliary: 'auxiliary_support',
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
    advance_pause: actions.advancePause,
    resume: actions.resume,
    reject: actions.reject,
    cancel: actions.cancel,
    open_claim: actions.openClaim,
    resolve_claim: actions.resolveClaim,
    reactivate: actions.reactivate,
    add_auxiliary: actions.addAuxiliary,
  }
  return map[action]
}

function pauseHandlers(actions: Mutations, values: ActionValues): Handlers {
  const note = values.note || undefined
  return {
    pause: () => {
      if (values.reasonId) {
        return actions.pause.mutateAsync({ reasonId: values.reasonId, note })
      }
    },
    advance_pause: () => {
      if (values.reasonId) {
        return actions.advancePause.mutateAsync({
          reasonId: values.reasonId,
          note,
        })
      }
    },
    resume: () => {
      if (values.reasonId) {
        return actions.resume.mutateAsync({ reasonId: values.reasonId })
      }
    },
  }
}

function simpleHandlers(actions: Mutations, values: ActionValues): Handlers {
  const note = values.note || undefined
  const text = values.text.trim()
  return {
    ...pauseHandlers(actions, values),
    assign_technician: () => {
      if (values.technicianId) {
        return actions.assignTechnician.mutateAsync({
          technicianId: values.technicianId,
          reasonId: values.reasonId || undefined,
        })
      }
    },
    start: () => actions.start.mutateAsync({}),
    attend: () => {
      if (text && values.serviceTypeId) {
        return actions.attend.mutateAsync({
          workDescription: text,
          serviceTypeId: values.serviceTypeId,
        })
      }
    },
    change_priority: () => {
      if (values.priorityId) {
        return actions.changePriority.mutateAsync({
          priorityId: values.priorityId,
        })
      }
    },
    comment: () => {
      if (text) return actions.comment.mutateAsync({ text })
    },
    reject: () => {
      if (values.reasonId) {
        return actions.reject.mutateAsync({ reasonId: values.reasonId, note })
      }
    },
    cancel: () => {
      if (values.reasonId) {
        return actions.cancel.mutateAsync({ reasonId: values.reasonId, note })
      }
    },
  }
}

function claimHandlers(actions: Mutations, values: ActionValues): Handlers {
  const note = values.note || undefined
  const text = values.text.trim()
  return {
    open_claim: () => {
      if (values.reasonId && text) {
        return actions.openClaim.mutateAsync({
          reasonId: values.reasonId,
          description: text,
        })
      }
    },
    resolve_claim: () => {
      return actions.resolveClaim.mutateAsync({
        resolution: values.resolution,
        resultId: values.reasonId || undefined,
        note,
      })
    },
    reactivate: () => {
      if (values.reasonId) {
        return actions.reactivate.mutateAsync({ reasonId: values.reasonId })
      }
    },
    add_auxiliary: () => {
      if (values.technicianId && values.reasonId) {
        return actions.addAuxiliary.mutateAsync({
          technicianId: values.technicianId,
          reasonId: values.reasonId,
          note,
        })
      }
    },
  }
}

export function buildSubmitHandlers(
  actions: Mutations,
  values: ActionValues,
): Handlers {
  return {
    ...simpleHandlers(actions, values),
    ...claimHandlers(actions, values),
  }
}
