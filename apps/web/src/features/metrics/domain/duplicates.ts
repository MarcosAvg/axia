// Agregados de duplicados (funciones puras).

import type { DuplicateDimensionRow } from './metrics'

export interface DimensionDuplicateRate {
  dimension: string
  tickets: number
  duplicates: number
  rate: number
}

/** Tasa de duplicados agregada por dimensión (todas sus agrupaciones). */
export function duplicateRateByDimension(
  rows: DuplicateDimensionRow[],
): DimensionDuplicateRate[] {
  const totals = new Map<string, { tickets: number; duplicates: number }>()
  for (const row of rows) {
    const current = totals.get(row.dimension) ?? { tickets: 0, duplicates: 0 }
    current.tickets += row.tickets
    current.duplicates += row.duplicates
    totals.set(row.dimension, current)
  }
  return [...totals.entries()]
    .map(([dimension, total]) => ({
      dimension,
      tickets: total.tickets,
      duplicates: total.duplicates,
      rate: total.tickets > 0 ? total.duplicates / total.tickets : 0,
    }))
    .sort((a, b) => b.rate - a.rate)
}
