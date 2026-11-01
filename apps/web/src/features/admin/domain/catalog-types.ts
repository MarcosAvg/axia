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
  /** Valor para registros nuevos y para números vacíos. */
  defaultValue?: string | number | boolean
}

/** Presentación del valor de una columna de solo lectura. */
type AdminColumnFormat = 'minutes' | 'datetime' | 'account'

export interface AdminColumn {
  key: string
  label: string
  optionsTable?: AdminTable
  /** Formato de presentación del valor (`minutes`, `datetime`, `account`). */
  format?: AdminColumnFormat
  /** Alineación de la columna; por defecto a la izquierda. */
  align?: 'left' | 'right' | 'center'
  /** Oculta la columna por debajo del punto de quiebre indicado. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** Recorta el texto largo y lo muestra completo en el título. */
  truncate?: boolean
  /** Etiquetas fijas para valores de un enumerado (p. ej. `use`). */
  options?: { value: string; label: string }[]
}

/** Árbol dentro de un catálogo: padre, orden natural de hermanos y etiqueta. */
export interface AdminCatalogTree {
  parentKey: string
  orderKey?: string
  labelKey?: string
  /** Columna que agrupa las raíces (por ejemplo, el uso de un motivo). */
  groupKey?: string
}

export interface AdminCatalogConfig {
  key: string
  table: AdminTable
  title: string
  orderBy?: string
  columns: AdminColumn[]
  fields: AdminField[]
  /** Presenta las filas como árbol (por ejemplo, motivos y subestados). */
  tree?: AdminCatalogTree
}
