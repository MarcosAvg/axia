import { adminMessages } from '../i18n'
import type { AdminCatalogConfig, AdminColumn } from './catalog-types'

const updatedColumn: AdminColumn = {
  key: 'updated_at',
  label: adminMessages.fields.updated_at,
  format: 'datetime',
  hideBelow: 'xl',
}

/** Columna de activo para la lista de orden (su celda es un interruptor). */
export const activeSortColumn: AdminColumn = {
  key: 'active',
  label: adminMessages.list.active,
}

/** Columnas de datos visibles de un catálogo, incluida su última actualización. */
export function dataColumnsFor(config: AdminCatalogConfig): AdminColumn[] {
  const own = config.columns.filter((column) => column.key !== 'active')
  const hasUpdated = own.some((column) => column.key === 'updated_at')
  return hasUpdated ? own : [...own, updatedColumn]
}
