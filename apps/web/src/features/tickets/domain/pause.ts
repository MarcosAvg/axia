// Subestado actual de la pausa a partir de sus pasos (funciones puras).

import type { TicketPauseStep } from './types'

/** Identificador del subestado actual (el paso abierto, o el último). */
export function currentPauseReasonId(steps: TicketPauseStep[]): string | null {
  const open = steps.filter((step) => step.exitedAt === null)
  const last = open.length > 0 ? open[open.length - 1] : steps[steps.length - 1]
  return last ? last.reasonId : null
}

/** ¿Hay una pausa abierta? */
export function hasOpenPause(steps: TicketPauseStep[]): boolean {
  return steps.some((step) => step.exitedAt === null)
}
