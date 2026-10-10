import type { AdminTable } from '../api/admin-api'

type AdminFieldKind =
  'text' | 'number' | 'minutes' | 'boolean' | 'select-table' | 'select-fixed'

export interface AdminField {
  name: string
  label: string
  kind: AdminFieldKind
  required?: boolean
  optionsTable?: AdminTable
  options?: { value: string; label: string }[]
}

export interface AdminColumn {
  key: string
  label: string
  optionsTable?: AdminTable
  /** Formato de presentación del valor (`minutes` = tiempo objetivo). */
  format?: 'minutes'
  /** Alineación de la columna; por defecto a la izquierda. */
  align?: 'left' | 'right' | 'center'
  /** Columna que referencia al padre para sangrar el árbol (p. ej. `parent_id`). */
  indentBy?: string
}

export interface AdminCatalogConfig {
  key: string
  table: AdminTable
  title: string
  orderBy?: string
  columns: AdminColumn[]
  fields: AdminField[]
}
