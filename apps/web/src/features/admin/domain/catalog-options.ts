import type { AdminTable } from '../api/admin-api'
import type { AdminCatalogConfig } from './catalog-types'

/** Columna que da el nombre legible de una tabla (los catálogos de personas usan `full_name`). */
function labelColumnFor(table: AdminTable): string {
  return table === 'requesters' || table === 'technicians'
    ? 'full_name'
    : 'name'
}

/** Fuentes de opciones (tablas referenciadas) que un catálogo necesita para sus selects. */
export function optionSourcesFor(
  config: AdminCatalogConfig,
): { table: AdminTable; labelColumn: string }[] {
  const tables = new Set<AdminTable>()
  for (const field of config.fields) {
    if (field.optionsTable) tables.add(field.optionsTable)
  }
  for (const column of config.columns) {
    if (column.optionsTable) tables.add(column.optionsTable)
  }
  return [...tables].map((table) => ({
    table,
    labelColumn: labelColumnFor(table),
  }))
}
