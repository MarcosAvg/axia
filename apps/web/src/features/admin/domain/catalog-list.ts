import type { AdminTable } from '../api/admin-api'
import type { AdminColumn } from './catalogs'

type OptionsFor = (table: AdminTable) => { id: string; label: string }[]

/** Etiqueta legible de un valor de columna con opciones fijas. */
export function fixedOptionLabel(
  options: { value: string; label: string }[],
  value: unknown,
): string {
  const option = options.find((item) => item.value === String(value))
  return option?.label ?? String(value ?? '')
}

/** Texto buscable de una fila: valores crudos más las etiquetas de sus relaciones. */
function catalogSearchText(
  row: Record<string, unknown>,
  columns: AdminColumn[],
  optionsFor: OptionsFor,
): string {
  const parts: string[] = []
  for (const column of columns) {
    const value = row[column.key]
    if (value !== null && value !== undefined && value !== '') {
      parts.push(String(value))
    }
    if (column.optionsTable) {
      const option = optionsFor(column.optionsTable).find(
        (candidate) => candidate.id === String(value),
      )
      if (option) parts.push(option.label)
    }
    if (column.options) parts.push(fixedOptionLabel(column.options, value))
  }
  return parts.join(' ').toLocaleLowerCase('es-MX')
}

/** Filtra las filas por el término de búsqueda (vacío = todas). */
export function filterCatalogRows(
  rows: Record<string, unknown>[],
  columns: AdminColumn[],
  optionsFor: OptionsFor,
  query: string,
): Record<string, unknown>[] {
  const term = query.trim().toLocaleLowerCase('es-MX')
  if (!term) return rows
  return rows.filter((row) =>
    catalogSearchText(row, columns, optionsFor).includes(term),
  )
}
