import type { ActionKey } from './actions'
import { groupActions } from './action-groups'

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

describe('groupActions', () => {
  it('agrupa por intención y deja la zona sensible al final', () => {
    const groups = groupActions(ALL_ACTIONS, 'attend')
    expect(groups.map((group) => group.key)).toEqual([
      'work',
      'assignment',
      'adjustments',
      'claims',
      'sensitive',
    ])
    expect(groups.find((group) => group.key === 'work')?.actions).toEqual([
      'start',
      'record_progress',
      'pause',
      'advance_pause',
      'resume',
    ])
    expect(groups.at(-1)?.actions).toEqual([
      'reject',
      'cancel',
      'mark_duplicate',
    ])
  })

  it('no repite la acción principal y omite grupos vacíos', () => {
    const groups = groupActions(
      ['attend', 'assign_technician', 'comment'],
      'attend',
    )
    expect(groups.map((group) => group.key)).toEqual([
      'assignment',
      'adjustments',
    ])
    expect(groups.flatMap((group) => group.actions)).toEqual([
      'assign_technician',
      'comment',
    ])
  })

  it('conserva todas las acciones conocidas una sola vez', () => {
    const primary = 'validate'
    const grouped = groupActions(ALL_ACTIONS, primary).flatMap(
      (group) => group.actions,
    )
    expect([...grouped, primary].sort()).toEqual([...ALL_ACTIONS].sort())
  })
})
