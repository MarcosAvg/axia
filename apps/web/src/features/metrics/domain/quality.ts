import type { DimensionRow } from './dimensions'
import { totalInMode, type TimeMode } from './time-mode'

export type RiskMeasure = 'reopen' | 'recapture' | 'reassignment'

/** Tasa de la dimensión que se usa como señal de riesgo. */
export function riskRate(row: DimensionRow, measure: RiskMeasure): number {
  if (measure === 'reopen') return row.reopenRate
  if (measure === 'recapture') return row.recaptureRate
  return row.reassignmentRate
}

/** Tiempo activo de la dimensión en el reloj elegido. */
export function activeMinutesInMode(row: DimensionRow, mode: TimeMode): number {
  return totalInMode(row.avgActive, row.avgActiveLabor, mode)
}
