import type { ActionKey } from './actions'
import { actionEmphasis } from './action-emphasis'
import type { ActionEmphasis } from './action-emphasis'

const ALL_ACTIONS: ActionKey[] = [
  'assign_technician',
  'assign_supervisor',
  'add_auxiliary',
  'start',
  'pause',
  'advance_pause',
  'resume',
  'record_progress',
  'attend',
  'validate',
  'reject',
  'cancel',
  'change_priority',
  'comment',
  'recapture',
  'open_claim',
  'resolve_claim',
  'mark_duplicate',
  'reactivate',
]

describe('actionEmphasis', () => {
  it('cubre todas las acciones con un énfasis definido', () => {
    for (const action of ALL_ACTIONS) {
      expect(actionEmphasis(action)).toBeDefined()
    }
  })

  it('clasifica por lo que hace la acción', () => {
    const expected: Partial<Record<ActionKey, ActionEmphasis>> = {
      validate: 'success',
      resolve_claim: 'success',
      reactivate: 'success',
      start: 'info',
      attend: 'info',
      assign_technician: 'info',
      pause: 'warning',
      change_priority: 'warning',
      reject: 'danger',
      cancel: 'danger',
      mark_duplicate: 'danger',
      comment: 'neutral',
      open_claim: 'neutral',
      recapture: 'neutral',
    }
    for (const [action, emphasis] of Object.entries(expected)) {
      expect(actionEmphasis(action as ActionKey)).toBe(emphasis)
    }
  })

  it('sólo las acciones de descarte son danger', () => {
    const danger = ALL_ACTIONS.filter(
      (action) => actionEmphasis(action) === 'danger',
    )
    expect(danger.sort()).toEqual(['cancel', 'mark_duplicate', 'reject'])
  })
})
