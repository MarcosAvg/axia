// Agrupaciones por dimensión para vistas simultáneas.

import type { Dimension } from './metrics'

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
