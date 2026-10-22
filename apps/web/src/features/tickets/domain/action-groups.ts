import type { ActionKey } from './actions'

const ACTION_GROUP_ORDER = [
  'work',
  'assignment',
  'adjustments',
  'claims',
  'sensitive',
] as const

export type ActionGroupKey = (typeof ACTION_GROUP_ORDER)[number]

const GROUP_ACTIONS: Record<ActionGroupKey, ActionKey[]> = {
  work: [
    'start',
    'record_progress',
    'pause',
    'advance_pause',
    'resume',
    'attend',
  ],
  assignment: ['assign_technician', 'assign_supervisor', 'add_auxiliary'],
  adjustments: [
    'change_priority',
    'comment',
    'recapture',
    'validate',
    'reactivate',
  ],
  claims: ['open_claim', 'resolve_claim'],
  sensitive: ['reject', 'cancel', 'mark_duplicate'],
}

export interface ActionGroup {
  key: ActionGroupKey
  actions: ActionKey[]
}

/** Agrupa las acciones visibles por intención, sin repetir la acción principal. */
export function groupActions(
  actions: ActionKey[],
  primary: ActionKey | null,
): ActionGroup[] {
  const remaining = new Set(actions.filter((action) => action !== primary))

  return ACTION_GROUP_ORDER.map((key) => ({
    key,
    actions: GROUP_ACTIONS[key].filter((action) => remaining.has(action)),
  })).filter((group) => group.actions.length > 0)
}
