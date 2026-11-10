// Tipos y funciones puras de los indicadores. Sin React, el cliente HTTP ni TanStack.

export type { MetricsSummary } from './metrics-summary'
export { EMPTY_SUMMARY } from './metrics-summary'

export interface MetricsFilters {
  from: string
  to: string
  buildingId: string
  teamId: string
  categoryId: string
  dependencyId: string
  outcome: string
  clock?: 'calendar' | 'laboral'
}

export const EMPTY_FILTERS: MetricsFilters = {
  from: '',
  to: '',
  buildingId: '',
  teamId: '',
  categoryId: '',
  dependencyId: '',
  outcome: '',
}

export type Dimension =
  | 'team'
  | 'building'
  | 'location'
  | 'category'
  | 'subcategory'
  | 'problem'
  | 'dependency'
  | 'requester'
  | 'outcome'
  | 'status'
  | 'priority'
  | 'channel'
  | 'service_type'

/** Minutos a partir de un intervalo de Postgres (`04:05:00`, `1 day 02:00:00`). */
export function intervalToMinutes(value: string | null | undefined): number {
  if (!value) return 0
  const negative = value.trim().startsWith('-')
  const text = value.replace(/^-/, '')
  let minutes = 0
  const days = text.match(/(\d+)\s+day/)
  if (days) minutes += Number(days[1]) * 1440
  const time = text.match(/(\d+):(\d{2})/)
  if (time) minutes += Number(time[1]) * 60 + Number(time[2])
  return negative ? -minutes : minutes
}

/** Duración legible a partir de minutos. */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min'
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const rest = rounded % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}

/** Porcentaje legible a partir de una razón 0..1. */
export function formatPercent(rate: number): string {
  if (!Number.isFinite(rate)) return '0%'
  return `${Math.round(rate * 100)}%`
}

export interface VolumePoint {
  month: string
  tickets: number
}

/** Arma un CSV simple a partir de encabezados y filas (valores ya formateados). */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (cell: string | number): string => {
    const text = String(cell)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')
}

export interface PauseReasonRow {
  reasonName: string
  pauses: number
  pauseMinutes: number
  pauseLaborMinutes: number
}

export interface DuplicateTicket {
  timeToMarkMinutes: number
}

export interface DuplicateAlert {
  decision: string
  candidates: number
  tickets: number
}

export interface DuplicateDimensionRow {
  dimension: string
  dimensionId: string
  dimensionName: string | null
  tickets: number
  duplicates: number
  duplicateRate: number
}

/** Promedio de minutos de una lista de números. */
export function averageOf(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export interface SatisfactionSummary {
  average: number | null
  ratings: number
}

/** Texto de la satisfacción promedio (o `—` sin datos). */
export function formatScore(average: number | null): string {
  if (average === null || !Number.isFinite(average)) return '—'
  return `${average.toFixed(1)} / 5`
}

export interface SlaSummary {
  withTarget: number
  met: number
  complianceRate: number | null
  avgTargetMinutes: number | null
  avgResolutionMinutes: number | null
}

export interface SlaPriorityRow {
  priorityId: string
  priorityName: string
  withTarget: number
  met: number
  complianceRate: number | null
}

/** Texto de una tasa (o `—` sin datos). */
export function formatRate(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate)) return '—'
  return formatPercent(rate)
}

export interface AgingRow {
  id: string
  folio: string
  status: string
  ageMinutes: number
}
