import { adminMessages } from '../i18n'
import type { AdminCatalogConfig } from './catalog-types'

const { titles, fields, list, reasonUse, clockClass } = adminMessages

const reasonUseOptions = Object.entries(reasonUse).map(([value, label]) => ({
  value,
  label,
}))
const clockClassOptions = Object.entries(clockClass).map(([value, label]) => ({
  value,
  label,
}))

/** Catálogo de motivos jerárquicos (con uso, subestado y clasificación de reloj). */
export const reasonsCatalog: AdminCatalogConfig = {
  key: 'reasons',
  table: 'reasons',
  title: titles.reasons,
  columns: [
    { key: 'name', label: fields.name },
    { key: 'use', label: fields.use },
    { key: 'active', label: list.active },
  ],
  fields: [
    {
      name: 'use',
      label: fields.use,
      kind: 'select-fixed',
      options: reasonUseOptions,
      required: true,
    },
    { name: 'name', label: fields.name, kind: 'text', required: true },
    {
      name: 'parent_id',
      label: fields.parent_id,
      kind: 'select-table',
      optionsTable: 'reasons',
    },
    { name: 'requires_note', label: fields.requires_note, kind: 'boolean' },
    {
      name: 'allows_estimated_date',
      label: fields.allows_estimated_date,
      kind: 'boolean',
    },
    {
      name: 'clock_class',
      label: fields.clock_class,
      kind: 'select-fixed',
      options: clockClassOptions,
      required: true,
    },
    { name: 'position', label: fields.position, kind: 'number' },
    { name: 'active', label: fields.active, kind: 'boolean' },
  ],
}
