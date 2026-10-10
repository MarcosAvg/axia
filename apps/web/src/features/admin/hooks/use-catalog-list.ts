import { useState } from 'react'
import { nextSort, sortRows } from '@/lib/sort'
import type { SortState } from '@/lib/sort'
import type { AdminTable } from '../api/admin-api'
import { filterCatalogRows } from '../domain/catalog-list'
import type { AdminCatalogConfig } from '../domain/catalogs'
import type { AdminOption } from './use-admin-catalog'

/** Búsqueda y orden en cliente sobre las filas de un catálogo. */
export function useCatalogList(
  config: AdminCatalogConfig,
  rows: Record<string, unknown>[],
  optionsFor: (table: AdminTable) => AdminOption[],
) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState | null>(null)
  const dataColumns = config.columns.filter((column) => column.key !== 'active')
  const visibleRows = sortRows(
    filterCatalogRows(rows, dataColumns, optionsFor, query),
    sort,
  )

  return {
    visibleRows,
    count: visibleRows.length,
    total: rows.length,
    query,
    setQuery,
    sort,
    toggleSort: (key: string) => setSort((current) => nextSort(current, key)),
  }
}
