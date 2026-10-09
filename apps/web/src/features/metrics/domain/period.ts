// Periodos y comparación de indicadores (funciones puras).

import type { MetricsFilters } from './metrics'

function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Rango de fechas (día) de los últimos `days` días, terminando hoy. */
export function rangeForDays(
  days: number,
  now: Date,
): { from: string; to: string } {
  const from = new Date(now.getTime() - days * 86_400_000)
  return { from: toDateString(from), to: toDateString(now) }
}

/**
 * Rango inmediatamente anterior de la misma longitud que `filters`.
 * Devuelve `null` si no hay un rango cerrado que comparar.
 */
export function previousRange(filters: MetricsFilters): MetricsFilters | null {
  if (!filters.from || !filters.to) return null
  const from = new Date(`${filters.from}T00:00:00`)
  const to = new Date(`${filters.to}T00:00:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
  if (days <= 0) return null
  const previousTo = new Date(from.getTime() - 86_400_000)
  const previousFrom = new Date(previousTo.getTime() - (days - 1) * 86_400_000)
  return {
    ...filters,
    from: toDateString(previousFrom),
    to: toDateString(previousTo),
  }
}

/** Cambio relativo de `current` contra `previous` (`null` si no es comparable). */
export function deltaOf(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null
  if (previous === 0) return null
  return (current - previous) / previous
}

/** Texto de un delta relativo, con signo. */
export function formatDelta(change: number | null): string {
  if (change === null || !Number.isFinite(change)) return '—'
  const percent = Math.round(Math.abs(change) * 100)
  if (percent === 0) return '0%'
  return `${change > 0 ? '+' : '-'}${percent}%`
}
