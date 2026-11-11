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

/** Tasa global de la señal, con el denominador que le corresponde. */
export function riskAverage(
  rows: DimensionRow[],
  measure: RiskMeasure,
): number {
  const tickets = rows.reduce((sum, row) => sum + row.tickets, 0)
  if (measure === 'reopen') {
    const reopened = rows.reduce((sum, row) => sum + row.reopened, 0)
    const closed = rows.reduce((sum, row) => sum + row.closedOrReopened, 0)
    return closed > 0 ? reopened / closed : 0
  }
  const count = rows.reduce(
    (sum, row) =>
      sum + (measure === 'recapture' ? row.recaptured : row.reassigned),
    0,
  )
  return tickets > 0 ? count / tickets : 0
}
