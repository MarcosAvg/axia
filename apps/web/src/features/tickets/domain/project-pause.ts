import type { ReasonOption } from '@/features/catalogs'
import type { PendingTicketAction } from './pending-actions'
import type { TicketPauseState } from './types'

function optionsFrom(reason: ReasonOption, catalog: ReasonOption[]) {
  const targets = new Set(reason.transitionIds)
  const next = catalog.filter(({ id }) => targets.has(id))
  return {
    advanceOptions: next.filter(
      (option) => option.pauseStepKind === 'progress',
    ),
    exitOptions: next.filter((option) => option.pauseStepKind === 'exit'),
  }
}

/** Calcula el subestado de la pausa abierta a partir de las acciones locales. */
export function projectPause(
  confirmed: TicketPauseState | null,
  pending: PendingTicketAction[],
  catalog: ReasonOption[],
): TicketPauseState | null {
  let current = confirmed
  for (const action of pending) {
    if (action.operation === 'resume') current = null
    if (action.operation !== 'pause' && action.operation !== 'advance_pause')
      continue
    const reason = catalog.find(({ id }) => id === action.args.reasonId)
    if (!reason?.transitionIds) return null
    if (action.operation === 'pause') {
      current = {
        pauseId: action.id,
        motiveId: reason.id,
        motiveName: reason.name,
        currentId: reason.id,
        currentName: reason.name,
        openedAt: action.occurredAt,
        ...optionsFrom(reason, catalog),
      }
    } else if (current) {
      current = {
        ...current,
        currentId: reason.id,
        currentName: reason.name,
        ...optionsFrom(reason, catalog),
      }
    }
  }
  return current
}
