// Agrupaciones por dimensión para vistas simultáneas.

import { byDimension } from './metrics'
import type { Dimension, DimensionRow, MetricsTicket } from './metrics'

export type { Dimension } from './metrics'

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

/** Todas las agrupaciones (una por dimensión), concatenadas. */
export function allDimensions(tickets: MetricsTicket[]): DimensionGroup[] {
  return DIMENSIONS.flatMap((dimension) =>
    byDimension(tickets, dimension).map((row) => ({ dimension, row })),
  )
}
