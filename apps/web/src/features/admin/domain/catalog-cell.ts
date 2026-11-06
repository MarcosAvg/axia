import { formatDateTime } from '@/lib/format'
import type { AdminTable } from '../api/admin-api'
import type { AdminColumn } from './catalog-types'
import { formatTargetMinutes } from './target'

export type OptionsFor = (table: AdminTable) => { id: string; label: string }[]

/** Etiqueta legible de un valor de columna con opciones fijas. */
export function fixedOptionLabel(
  options: { value: string; label: string }[],
  value: unknown,
): string {
  const option = options.find((item) => item.value === String(value))
  return option?.label ?? String(value ?? '')
}

/** Etiqueta de la fila referenciada por una columna de relación, si existe. */
function relationLabel(
  options: { id: string; label: string }[],
  value: unknown,
): string | null {
  return options.find((option) => option.id === String(value))?.label ?? null
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

const FORMATTERS: Record<
  NonNullable<AdminColumn['format']>,
  (value: unknown) => string
> = {
  minutes: (value) =>
    typeof value === 'number' ? formatTargetMinutes(value) : '',
  datetime: (value) =>
    typeof value === 'string' && value ? formatDateTime(value) : '',
  account: (value) => (typeof value === 'string' ? value : ''),
}

function plainText(column: AdminColumn, value: unknown): string {
  if (column.format) return FORMATTERS[column.format](value)
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) return value.map(String).join(', ')
  if (isBlank(value)) return ''
  return String(value)
}

/** Texto visible de una celda; las relaciones y enums muestran su etiqueta. */
export function cellText(
  column: AdminColumn,
  row: Record<string, unknown>,
  optionsFor: OptionsFor,
): string {
  const value = row[column.key]
  if (column.optionsTable) {
    return relationLabel(optionsFor(column.optionsTable), value) ?? ''
  }
  if (column.options) {
    if (Array.isArray(value)) {
      return value
        .map((item) => fixedOptionLabel(column.options!, item))
        .join(', ')
    }
    return isBlank(value) ? '' : fixedOptionLabel(column.options, value)
  }
  return plainText(column, value)
}

/**
 * Valor con el que se ordena una celda: la etiqueta visible en relaciones y
 * enums, el número en tiempos objetivo y el instante en fechas.
 */
export function cellSortValue(
  column: AdminColumn,
  row: Record<string, unknown>,
  optionsFor: OptionsFor,
): unknown {
  const value = row[column.key]
  if (column.optionsTable) {
    return relationLabel(optionsFor(column.optionsTable), value)
  }
  if (column.options) {
    if (Array.isArray(value)) {
      return value
        .map((item) => fixedOptionLabel(column.options!, item))
        .join(', ')
    }
    return isBlank(value) ? null : fixedOptionLabel(column.options, value)
  }
  return isBlank(value) ? null : value
}

/** Valor de orden de una columna desconocida (por ejemplo, `active`). */
export function rawSortValue(
  key: string,
  row: Record<string, unknown>,
): unknown {
  const value = row[key]
  return isBlank(value) ? null : value
}
