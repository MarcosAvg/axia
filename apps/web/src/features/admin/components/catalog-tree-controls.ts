import { useState } from 'react'
import type { AdminCatalogTree } from '../domain/catalog-types'
import { depthFunction, visibleRows } from '../domain/catalog-tree'

type Row = Record<string, unknown>

export interface TreeControls {
  labelKey: string
  depthOf: (row: Row) => number
  hasChildren: (row: Row) => boolean
  isCollapsed: (row: Row) => boolean
  toggle: (row: Row) => void
}

function parentIds(rows: Row[], tree: AdminCatalogTree): Set<string> {
  const ids = new Set<string>()
  for (const row of rows) {
    const parent = row[tree.parentKey]
    if (parent !== null && parent !== undefined) ids.add(String(parent))
  }
  return ids
}

/**
 * Estado de un catálogo en árbol: profundidad, nodos con hijos y qué ramas están
 * contraídas. Mientras hay una búsqueda activa todo se muestra expandido.
 */
export function useTreeControls(
  rows: Row[],
  tree: AdminCatalogTree | undefined,
  isFiltering: boolean,
): { controls?: TreeControls; visible: Row[] } {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  if (!tree) return { visible: rows }
  const children = parentIds(rows, tree)
  const controls: TreeControls = {
    labelKey: tree.labelKey ?? 'name',
    depthOf: depthFunction(rows, tree.parentKey),
    hasChildren: (row) => children.has(String(row.id)),
    isCollapsed: (row) => !isFiltering && collapsed.has(String(row.id)),
    toggle: (row) =>
      setCollapsed((current) => {
        const next = new Set(current)
        const id = String(row.id)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
  }
  const visible = visibleRows(
    rows,
    tree.parentKey,
    isFiltering ? new Set() : collapsed,
  )
  return { controls, visible }
}
