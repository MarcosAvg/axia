import { isRobustMeasure, type TimeMeasure } from '@/lib/time-measure'

export type TimeMode = 'calendar' | 'laboral' | 'extra'

export const TIME_MODES: TimeMode[] = ['calendar', 'laboral', 'extra']

const FIELD_SUFFIX: Record<TimeMode, string> = {
  calendar: '',
  laboral: 'Labor',
  extra: 'Extra',
}

function camel(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  )
}

function capitalize(value: string): string {
  return value[0]?.toUpperCase() + value.slice(1)
}

function fieldName(key: string): string {
  return capitalize(camel(key))
}

function resolutionValue(
  row: Record<string, number>,
  measure: TimeMeasure,
  mode: TimeMode,
): number {
  const prefix = measure === 'total' ? 'sum' : 'avg'
  return totalInMode(
    Number(row[`${prefix}TotalClosed`] ?? 0),
    Number(row[`${prefix}TotalClosedLabor`] ?? 0),
    mode,
  )
}

function regularValue(
  row: Record<string, number>,
  key: string,
  measure: TimeMeasure,
  mode: TimeMode,
): number {
  if (key === 'total' && mode === 'extra') {
    return Number(
      row[measure === 'total' ? 'sumTotalExtra' : 'avgTotalExtra'] ?? 0,
    )
  }
  const prefix = measure === 'total' ? 'sum' : 'avg'
  return Number(row[`${prefix}${fieldName(key)}${FIELD_SUFFIX[mode]}`] ?? 0)
}

/** Valor de una fase para el modo y la medida activos. */
export function measureValue(
  row: Record<string, number>,
  key: string,
  mode: TimeMode,
  measure: TimeMeasure,
): number {
  if (key === 'dormant' && mode !== 'calendar') return 0
  if (isRobustMeasure(measure)) {
    return Number(row[`stat${fieldName(key)}`] ?? 0)
  }
  if (key === 'resolution') return resolutionValue(row, measure, mode)
  return regularValue(row, key, measure, mode)
}

/** Muestra de la fase en una medida robusta; `null` en media o suma. */
export function measureSample(
  row: Record<string, number>,
  key: string,
  measure: TimeMeasure,
  mode: TimeMode = 'calendar',
): number | null {
  if (!isRobustMeasure(measure)) return null
  if (key === 'dormant' && mode !== 'calendar') return 0
  return Number(row[`n${fieldName(key)}`] ?? 0)
}

/** Total de un tramo en el reloj elegido; el extra descuenta el laboral. */
export function totalInMode(
  continuous: number,
  labor: number,
  mode: TimeMode,
): number {
  if (mode === 'laboral') return labor
  if (mode === 'extra') return Math.max(0, continuous - labor)
  return continuous
}
