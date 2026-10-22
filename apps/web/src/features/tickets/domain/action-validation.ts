import type { ActionValues } from './action-values'
import type { ActionKey } from './actions'

export type ActionField =
  'technician' | 'reason' | 'priority' | 'serviceType' | 'text' | 'evidence'

const REQUIRED: Partial<Record<ActionKey, ActionField[]>> = {
  assign_technician: ['technician'],
  add_auxiliary: ['technician', 'reason'],
  start: ['evidence'],
  record_progress: ['evidence'],
  attend: ['serviceType', 'text', 'evidence'],
  pause: ['reason'],
  advance_pause: ['reason'],
  resume: ['reason'],
  reject: ['reason'],
  cancel: ['reason'],
  change_priority: ['priority'],
  comment: ['text'],
  open_claim: ['reason', 'text', 'evidence'],
  reactivate: ['reason'],
}

function isMissing(
  field: ActionField,
  values: ActionValues,
  hasEvidence: boolean,
): boolean {
  switch (field) {
    case 'evidence':
      return !hasEvidence
    case 'technician':
      return values.technicianId.length === 0
    case 'reason':
      return values.reasonId.length === 0
    case 'priority':
      return values.priorityId.length === 0
    case 'serviceType':
      return values.serviceTypeId.length === 0
    case 'text':
      return values.text.trim().length === 0
  }
}

/** Campos obligatorios que faltan para enviar la acción. */
export function missingActionFields(
  action: ActionKey,
  values: ActionValues,
  hasEvidence: boolean,
): ActionField[] {
  return (REQUIRED[action] ?? []).filter((field) =>
    isMissing(field, values, hasEvidence),
  )
}
