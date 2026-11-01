import { compareValues, compareWith } from '@/lib/sort'
import type { SortState } from '@/lib/sort'
import type { AdminCatalogTree } from './catalog-types'

type Row = Record<string, unknown>

const MAX_DEPTH = 50

function idOf(row: Row): string {
  return String(row.id)
}

function parentOf(
  row: Row,
  tree: AdminCatalogTree,
  ids: Set<string>,
): string | null {
  const parent = row[tree.parentKey]
  if (parent === null || parent === undefined || parent === '') return null
  const id = String(parent)
  if (!ids.has(id) || id === idOf(row)) return null
  return id
}

/** Profundidad de cada fila dentro de su árbol (raíz = 0). */
export function depthFunction(
  rows: Row[],
  parentKey: string,
): (row: Row) => number {
  const byId = new Map(rows.map((row) => [idOf(row), row]))
  return (row) => {
    let depth = 0
    let cursor = row[parentKey]
    while (cursor && byId.has(String(cursor)) && depth < MAX_DEPTH) {
      depth += 1
      cursor = byId.get(String(cursor))?.[parentKey]
    }
    return depth
  }
}

/** Orden natural de hermanos: grupo, orden explícito y etiqueta. */
function naturalCompare(
  tree: AdminCatalogTree,
  groupRank?: (row: Row) => number,
) {
  const labelKey = tree.labelKey ?? 'name'
  return (a: Row, b: Row) => {
    if (groupRank) {
      const byGroup = compareValues(groupRank(a), groupRank(b))
      if (byGroup !== 0) return byGroup
    }
    if (tree.orderKey) {
      const byOrder = compareValues(a[tree.orderKey], b[tree.orderKey])
      if (byOrder !== 0) return byOrder
    }
    return compareValues(a[labelKey], b[labelKey])
  }
}

/**
 * Ordena el árbol conservando juntos a cada padre y sus descendientes. Con un
 * orden activo se ordenan los hermanos entre sí, nunca se aplana la jerarquía.
 */
export interface TreeOrder {
  sort: SortState | null
  valueOf: (row: Row, key: string) => unknown
  groupRank?: (row: Row) => number
}

/** Rango de la columna que agrupa las raíces, según el orden de sus opciones. */
export function groupRanker(
  tree: AdminCatalogTree | undefined,
  options: { value: string }[] | undefined,
): ((row: Row) => number) | undefined {
  if (!tree?.groupKey) return undefined
  const key = tree.groupKey
  const rank = new Map(
    (options ?? []).map((option, index) => [option.value, index]),
  )
  return (row) => rank.get(String(row[key] ?? '')) ?? Number.MAX_SAFE_INTEGER
}

export function orderTreeRows(
  rows: Row[],
  tree: AdminCatalogTree,
  order: TreeOrder,
): Row[] {
  const ids = new Set(rows.map(idOf))
  const buckets = new Map<string | null, Row[]>()
  for (const row of rows) {
    const parent = parentOf(row, tree, ids)
    const siblings = buckets.get(parent) ?? []
    siblings.push(row)
    buckets.set(parent, siblings)
  }
  const { sort, valueOf, groupRank } = order
  const fallback = naturalCompare(tree, groupRank)
  const compare = sort
    ? (a: Row, b: Row) => {
        const bySort = compareWith(
          valueOf(a, sort.key),
          valueOf(b, sort.key),
          sort.dir,
        )
        return bySort !== 0 ? bySort : fallback(a, b)
      }
    : fallback
  for (const siblings of buckets.values()) siblings.sort(compare)

  const ordered: Row[] = []
  const seen = new Set<string>()
  function walk(parent: string | null, depth: number) {
    if (depth > MAX_DEPTH) return
    for (const row of buckets.get(parent) ?? []) {
      const id = idOf(row)
      if (seen.has(id)) continue
      seen.add(id)
      ordered.push(row)
      walk(id, depth + 1)
    }
  }
  walk(null, 0)
  for (const row of rows) {
    if (!seen.has(idOf(row))) ordered.push(row)
  }
  return ordered
}

/** Conserva las filas que coinciden y también a sus antecesores. */
export function rowsWithAncestors(
  rows: Row[],
  tree: AdminCatalogTree,
  isMatch: (row: Row) => boolean,
): Row[] {
  const byId = new Map(rows.map((row) => [idOf(row), row]))
  const included = new Set<string>()
  for (const row of rows) {
    if (!isMatch(row)) continue
    let cursor: Row | undefined = row
    let depth = 0
    while (cursor && depth <= MAX_DEPTH) {
      const id = idOf(cursor)
      if (included.has(id)) break
      included.add(id)
      const parent: unknown = cursor[tree.parentKey]
      cursor =
        parent === null || parent === undefined
          ? undefined
          : byId.get(String(parent))
      depth += 1
    }
  }
  return rows.filter((row) => included.has(idOf(row)))
}

/** Filas visibles al contraer nodos: se oculta todo descendiente de uno contraído. */
export function visibleRows(
  rows: Row[],
  parentKey: string,
  collapsed: ReadonlySet<string>,
): Row[] {
  if (collapsed.size === 0) return rows
  const byId = new Map(rows.map((row) => [idOf(row), row]))
  function isHidden(row: Row): boolean {
    let cursor = row[parentKey]
    let depth = 0
    while (cursor && depth <= MAX_DEPTH) {
      const parentId = String(cursor)
      if (collapsed.has(parentId)) return true
      cursor = byId.get(parentId)?.[parentKey]
      depth += 1
    }
    return false
  }
  return rows.filter((row) => !isHidden(row))
}
