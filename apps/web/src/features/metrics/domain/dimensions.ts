// Agrupaciones por dimensión para las vistas del tablero.

import type { Dimension } from './metrics'

export type { Dimension } from './metrics'

export interface DimensionRow {
  id: string
  name: string
  parentId: string | null
  tickets: number
  closedOrReopened: number
  reassigned: number
  recaptured: number
  open: number
  avgActive: number
  avgActiveLabor: number
  avgTotal: number
  avgTotalAll: number
  avgTotalClosed: number
  avgTotalClosedLabor: number
  avgActiveExtra: number
  avgResponse: number
  avgAssignment: number
  avgPendingTake: number
  avgReassignment: number
  avgWait: number
  avgPause: number
  avgValidation: number
  avgClaim: number
  avgTotalLabor: number
  avgTotalExtra: number
  avgNetLabor: number
  avgResponseLabor: number
  avgResponseExtra: number
  sumResponseLabor: number
  sumResponseExtra: number
  avgAssignmentLabor: number
  avgAssignmentExtra: number
  sumAssignmentLabor: number
  sumAssignmentExtra: number
  avgPendingTakeLabor: number
  avgPendingTakeExtra: number
  sumPendingTakeLabor: number
  sumPendingTakeExtra: number
  avgReassignmentLabor: number
  avgReassignmentExtra: number
  sumReassignmentLabor: number
  sumReassignmentExtra: number
  avgWaitLabor: number
  avgWaitExtra: number
  sumWaitLabor: number
  sumWaitExtra: number
  avgPauseLabor: number
  avgPauseExtra: number
  sumPauseLabor: number
  sumPauseExtra: number
  avgValidationLabor: number
  avgValidationExtra: number
  sumValidationLabor: number
  sumValidationExtra: number
  avgClaimLabor: number
  avgClaimExtra: number
  sumClaimLabor: number
  sumClaimExtra: number
  avgDormant: number
  sumDormant: number
  avgDuplicateReview: number
  sumDuplicateReview: number
  sumActive: number
  sumActiveLabor: number
  sumTotal: number
  sumTotalAll: number
  sumTotalClosed: number
  sumTotalClosedLabor: number
  sumActiveExtra: number
  sumResponse: number
  sumAssignment: number
  sumPendingTake: number
  sumReassignment: number
  sumWait: number
  sumPause: number
  sumValidation: number
  sumClaim: number
  sumTotalLabor: number
  sumTotalExtra: number
  sumNetLabor: number
  reassignmentRate: number
  recaptureRate: number
  reopenRate: number
  firstFixRate: number
  reopened: number
  closed: number
}

export const DIMENSIONS: Dimension[] = [
  'category',
  'subcategory',
  'problem',
  'building',
  'location',
  'dependency',
  'team',
  'requester',
  'outcome',
  'status',
  'priority',
  'channel',
  'service_type',
]

export interface DimensionGroup {
  dimension: Dimension
  row: DimensionRow
}

/** Filas de una dimensión, de mayor a menor volumen. */
export function rowsByDimension(
  groups: DimensionGroup[],
  dimension: Dimension,
): DimensionRow[] {
  return groups
    .filter((group) => group.dimension === dimension)
    .map((group) => group.row)
    .sort((left, right) => right.tickets - left.tickets)
}

export interface HierarchyNode {
  id: string
  name: string
  value: number
  children: HierarchyNode[]
}

/**
 * Árbol para el Sunburst. `path` va del nivel superior al nivel visible, p. ej.
 * `['category', 'subcategory', 'problem']`.
 */
export function buildHierarchy(
  groups: DimensionGroup[],
  path: Dimension[],
): HierarchyNode[] {
  const levels = path.map((dimension) => rowsByDimension(groups, dimension))
  const roots = new Map<string, HierarchyNode>()
  for (const row of levels[0] ?? []) {
    roots.set(row.id, {
      id: row.id,
      name: row.name,
      value: row.tickets,
      children: [],
    })
  }
  let parents = roots
  for (let level = 1; level < levels.length; level += 1) {
    const next = new Map<string, HierarchyNode>()
    for (const row of levels[level] ?? []) {
      const parent = parents.get(row.parentId ?? '')
      if (!parent) continue
      const node: HierarchyNode = {
        id: row.id,
        name: row.name,
        value: row.tickets,
        children: [],
      }
      parent.children.push(node)
      next.set(row.id, node)
    }
    parents = next
  }
  const sort = (nodes: HierarchyNode[]): HierarchyNode[] =>
    nodes
      .sort((left, right) => right.value - left.value)
      .map((node) => ({ ...node, children: sort(node.children) }))
  return sort([...roots.values()])
}

/** Dimensión padre que corresponde a una dimensión jerárquica. */
export function parentDimension(dimension: Dimension): Dimension | null {
  if (dimension === 'subcategory') return 'category'
  if (dimension === 'problem') return 'subcategory'
  if (dimension === 'location') return 'building'
  return null
}

/** Ruta jerárquica hasta la dimensión indicada. */
export function hierarchyPath(dimension: Dimension): Dimension[] {
  if (dimension === 'category') return ['category']
  if (dimension === 'subcategory') return ['category', 'subcategory']
  if (dimension === 'problem') {
    return ['category', 'subcategory', 'problem']
  }
  if (dimension === 'location') return ['building', 'location']
  if (dimension === 'building') return ['building']
  return [dimension]
}
