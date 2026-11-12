/**
 * Medida de tiempos del tablero: promedio, acumulado o una medida robusta
 * (mediana, P90, P95, máximo). Módulo puro; la persistencia vive en el
 * proveedor de React.
 */

export const TIME_MEASURES = [
  'average',
  'total',
  'median',
  'p90',
  'p95',
  'max',
] as const

export type TimeMeasure = (typeof TIME_MEASURES)[number]

const DEFAULT_TIME_MEASURE: TimeMeasure = 'average'

export const TIME_MEASURE_STORAGE_KEY = 'axia.time-aggregation'

function isTimeMeasure(value: unknown): value is TimeMeasure {
  return (
    typeof value === 'string' &&
    (TIME_MEASURES as readonly string[]).includes(value)
  )
}

/** Medida válida o la predeterminada. */
export function resolveTimeMeasure(value: unknown): TimeMeasure {
  return isTimeMeasure(value) ? value : DEFAULT_TIME_MEASURE
}

/** Una medida robusta se calcula sobre la distribución, no sobre la media. */
export function isRobustMeasure(measure: TimeMeasure): boolean {
  return measure !== 'average' && measure !== 'total'
}
