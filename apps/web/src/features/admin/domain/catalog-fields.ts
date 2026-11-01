import { adminMessages } from '../i18n'
import type { AdminColumn, AdminField } from './catalog-types'

const { fields, list } = adminMessages

export const nameField: AdminField = {
  name: 'name',
  label: fields.name,
  kind: 'text',
  required: true,
}
export const activeField: AdminField = {
  name: 'active',
  label: fields.active,
  kind: 'boolean',
  defaultValue: true,
}
export const activeColumn: AdminColumn = { key: 'active', label: list.active }
export const nameColumn: AdminColumn = { key: 'name', label: fields.name }
export const fullNameColumn: AdminColumn = {
  key: 'full_name',
  label: fields.full_name,
}

/** Columna de conteo, alineada a la derecha y ocultable en pantallas angostas. */
export function countColumn(
  key: string,
  label: string,
  hideBelow?: AdminColumn['hideBelow'],
): AdminColumn {
  return { key, label, align: 'right', hideBelow }
}
