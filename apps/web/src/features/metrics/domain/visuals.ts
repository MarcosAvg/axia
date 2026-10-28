// Composiciones visuales del tablero (funciones puras, sin React).

import type { RejectCancelRow } from './indicators'

export type CyclePhase =
  | 'response'
  | 'assignment'
  | 'reassignment'
  | 'wait'
  | 'active'
  | 'pause'
  | 'validation'
  | 'claim'
  | 'unclassified'

export interface CycleInput {
  response: number
  assignment: number
  reassignment: number
  wait: number
  active: number
  pause: number
  validation: number
  claim: number
  total: number
}

export interface CycleSlice {
  phase: CyclePhase
  minutes: number
}

/**
 * Reparte el ciclo medio en fases. Lo que el total no explica queda como
 * "sin clasificar"; se acota a cero para no inventar tiempo negativo.
 */
export function cyclePhases(input: CycleInput): CycleSlice[] {
  const known =
    input.response +
    input.assignment +
    input.reassignment +
    input.wait +
    input.active +
    input.pause +
    input.validation +
    input.claim
  const unclassified = Math.max(0, input.total - known)
  return [
    { phase: 'response', minutes: Math.max(0, input.response) },
    { phase: 'assignment', minutes: Math.max(0, input.assignment) },
    { phase: 'reassignment', minutes: Math.max(0, input.reassignment) },
    { phase: 'wait', minutes: Math.max(0, input.wait) },
    { phase: 'active', minutes: Math.max(0, input.active) },
    { phase: 'pause', minutes: Math.max(0, input.pause) },
    { phase: 'validation', minutes: Math.max(0, input.validation) },
    { phase: 'claim', minutes: Math.max(0, input.claim) },
    { phase: 'unclassified', minutes: unclassified },
  ]
}

/** Parte acumulada (0..1) de cada valor, para el Pareto. */
export function cumulativeShare(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0)
  if (total <= 0) return values.map(() => 0)
  let accumulated = 0
  return values.map((value) => {
    accumulated += Math.max(0, value)
    return accumulated / total
  })
}

/** Proporción acotada a 0..1; evita divisiones por cero en las barras. */
export function shareOf(value: number, total: number): number {
  if (!(total > 0) || !Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value / total))
}

export interface RejectReasonRow {
  name: string
  rejected: number
  cancelled: number
  total: number
}

/** Agrupa rechazos y cancelaciones por motivo, de mayor a menor. */
export function rejectReasons(rows: RejectCancelRow[]): RejectReasonRow[] {
  const byReason = new Map<string, RejectReasonRow>()
  for (const row of rows) {
    const entry = byReason.get(row.reasonName) ?? {
      name: row.reasonName,
      rejected: 0,
      cancelled: 0,
      total: 0,
    }
    if (row.eventType === 'cancelled') entry.cancelled += row.tickets
    else entry.rejected += row.tickets
    entry.total += row.tickets
    byReason.set(row.reasonName, entry)
  }
  return [...byReason.values()].sort((left, right) => right.total - left.total)
}
