// Agrupaciones por dimensión para vistas simultáneas.

import { summarize } from './metrics'
import type { Dimension, MetricsTicket } from './metrics'

export type { Dimension } from './metrics'

export interface DimensionRow {
  id: string
  tickets: number
  avgActive: number
  avgTotal: number
  avgActiveExtra: number
  sumActive: number
  sumTotal: number
  sumActiveExtra: number
  reassignmentRate: number
  recaptureRate: number
}

const DIMENSION_ID: Record<Dimension, keyof MetricsTicket> = {
  team: 'teamId',
  building: 'buildingId',
  category: 'categoryId',
  dependency: 'dependencyId',
  requester: 'requesterId',
}

export const DIMENSIONS: Dimension[] = [
  'team',
  'building',
  'category',
  'dependency',
  'requester',
]

export interface DimensionGroup {
  dimension: Dimension
  row: DimensionRow
}

/** Agrega los tiquets por una dimensión (equipo, edificio, categoría, dependencia). */
export function byDimension(
  tickets: MetricsTicket[],
  dimension: Dimension,
): DimensionRow[] {
  const key = DIMENSION_ID[dimension]
  const groups = new Map<string, MetricsTicket[]>()
  for (const ticket of tickets) {
    const id = String(ticket[key])
    const list = groups.get(id)
    if (list) list.push(ticket)
    else groups.set(id, [ticket])
  }
  return [...groups.entries()]
    .map(([id, list]) => {
      const summary = summarize(list)
      return {
        id,
        tickets: list.length,
        avgActive: summary.avgActive,
        avgTotal: summary.avgTotal,
        avgActiveExtra: summary.avgActiveExtra,
        sumActive: summary.sumActive,
        sumTotal: summary.sumTotal,
        sumActiveExtra: summary.sumActiveExtra,
        reassignmentRate: summary.reassignmentRate,
        recaptureRate: summary.recaptureRate,
      }
    })
    .sort((a, b) => b.tickets - a.tickets)
}

/** Todas las agrupaciones (una por dimensión), concatenadas. */
export function allDimensions(tickets: MetricsTicket[]): DimensionGroup[] {
  return DIMENSIONS.flatMap((dimension) =>
    byDimension(tickets, dimension).map((row) => ({ dimension, row })),
  )
}
