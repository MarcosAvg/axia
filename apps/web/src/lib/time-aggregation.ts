/**
 * Preferencia de agregación de tiempos en los tableros: **promedio** o
 * **acumulado** (suma). Módulo puro y compartido por Métricas y el Panel; la
 * persistencia vive aquí y el contexto de React en `components/shared`.
 */

import { messages } from './i18n'
import { readPreference, writePreference } from './theme'

export const TIME_AGGREGATIONS = ['average', 'total'] as const
export type TimeAggregation = (typeof TIME_AGGREGATIONS)[number]

const DEFAULT_TIME_AGGREGATION: TimeAggregation = 'average'
const TIME_AGGREGATION_STORAGE_KEY = 'axia.time-aggregation'

export function isTimeAggregation(value: unknown): value is TimeAggregation {
  return (
    typeof value === 'string' &&
    (TIME_AGGREGATIONS as readonly string[]).includes(value)
  )
}

/** Agregación válida o la predeterminada. */
export function resolveTimeAggregation(value: unknown): TimeAggregation {
  return isTimeAggregation(value) ? value : DEFAULT_TIME_AGGREGATION
}

/** Lee la preferencia guardada (o la predeterminada). */
export function readTimeAggregation(): TimeAggregation {
  return resolveTimeAggregation(readPreference(TIME_AGGREGATION_STORAGE_KEY))
}

/** Guarda la preferencia. */
export function writeTimeAggregation(value: TimeAggregation): void {
  writePreference(TIME_AGGREGATION_STORAGE_KEY, value)
}

/** Elige entre promedio y acumulado según la vista activa. */
export function timeValue(
  aggregation: TimeAggregation,
  average: number,
  total: number,
): number {
  return aggregation === 'total' ? total : average
}

/** Título con el modo cuando es acumulado: "Trabajo activo (acumulado)". */
export function aggregationLabel(
  label: string,
  aggregation: TimeAggregation,
): string {
  return aggregation === 'total'
    ? `${label} (${messages.aggregation.totalTag})`
    : label
}

/** Añade al texto de ayuda el modo activo (promedio o acumulado). */
export function aggregationHint(
  hint: string | undefined,
  aggregation: TimeAggregation,
): string {
  const mode =
    aggregation === 'total'
      ? messages.aggregation.totalHint
      : messages.aggregation.averageHint
  return hint ? `${hint} ${mode}` : mode
}
