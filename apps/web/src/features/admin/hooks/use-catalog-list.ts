import { useState } from 'react'
import { sortRows } from '@/lib/sort'
import type { SortState } from '@/lib/sort'
import type { AdminTable } from '../api/admin-api'
import { cellSortValue, rawSortValue } from '../domain/catalog-cell'
import { activeSortColumn, dataColumnsFor } from '../domain/catalog-columns'
import { filterCatalogRows } from '../domain/catalog-list'
import {
  groupRanker,
  orderTreeRows,
  rowsWithAncestors,
} from '../domain/catalog-tree'
import type { AdminCatalogConfig } from '../domain/catalogs'
import type { AdminOption } from './use-admin-catalog'

type Row = Record<string, unknown>

/** Búsqueda y orden en cliente sobre las filas de un catálogo. */
export function useCatalogList(
  config: AdminCatalogConfig,
  rows: Row[],
  optionsFor: (table: AdminTable) => AdminOption[],
) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState | null>(null)
  const columns = dataColumnsFor(config)
  const columnsByKey = new Map(columns.map((column) => [column.key, column]))
  const valueOf = (row: Row, key: string): unknown => {
    const column = columnsByKey.get(key)
    return column
      ? cellSortValue(column, row, optionsFor)
      : rawSortValue(key, row)
  }

  const groupColumn = config.tree?.groupKey
    ? columnsByKey.get(config.tree.groupKey)
    : undefined
  const groupRank = groupRanker(config.tree, groupColumn?.options)

  const matched = filterCatalogRows(rows, columns, optionsFor, query)
  const matchedSet = new Set(matched)
  // Al buscar dentro de un árbol se conservan los antecesores para no perder el contexto.
  const filtered =
    config.tree && query.trim()
      ? rowsWithAncestors(rows, config.tree, (row) => matchedSet.has(row))
      : matched
  const visibleRows = config.tree
    ? orderTreeRows(filtered, config.tree, { sort, valueOf, groupRank })
    : sortRows(filtered, sort, valueOf)

  return {
    columns,
    sortableColumns: [...columns, activeSortColumn],
    visibleRows,
    count: visibleRows.length,
    total: rows.length,
    query,
    setQuery,
    sort,
    isFiltering: query.trim().length > 0,
    toggleSort: (key: string) =>
      setSort((current) =>
        current?.key === key
          ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
          : { key, dir: 'asc' },
      ),
    selectSort: (key: string) =>
      setSort((current) =>
        key ? { key, dir: current?.key === key ? current.dir : 'asc' } : null,
      ),
    toggleDirection: () =>
      setSort((current) =>
        current
          ? { key: current.key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
          : current,
      ),
  }
}
