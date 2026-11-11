import { adminMessages } from '../i18n'
import type { AdminCatalogConfig } from './catalog-types'

const { titles, fields, list, reasonUse, clockClass, pauseStepKind } =
  adminMessages

const reasonUseOptions = Object.entries(reasonUse).map(([value, label]) => ({
  value,
  label,
}))
const clockClassOptions = Object.entries(clockClass).map(([value, label]) => ({
  value,
  label,
}))
const pauseStepKindOptions = Object.entries(pauseStepKind).map(
  ([value, label]) => ({ value, label }),
)

/** Catálogo de motivos jerárquicos (con uso, subestado y clasificación de reloj). */
export const reasonsCatalog: AdminCatalogConfig = {
  key: 'reasons',
  table: 'reasons',
  title: titles.reasons,
  tree: {
    parentKey: 'parent_id',
    orderKey: 'position',
    labelKey: 'name',
    groupKey: 'use',
  },
  columns: [
    { key: 'name', label: fields.name },
    { key: 'use', label: fields.use, options: reasonUseOptions },
    {
      key: 'parent_id',
      label: fields.parent_id,
      optionsTable: 'reasons',
      hideBelow: 'lg',
    },
    {
      key: 'children_count',
      label: fields.children_count,
      align: 'right',
      hideBelow: 'xl',
    },
    {
      key: 'requires_note',
      label: fields.requires_note,
      align: 'center',
      hideBelow: 'xl',
    },
    {
      key: 'allows_estimated_date',
      label: fields.allows_estimated_date,
      align: 'center',
      hideBelow: '2xl',
    },
    {
      key: 'clock_class',
      label: fields.clock_class,
      options: clockClassOptions,
    },
    {
      key: 'pause_step_kind',
      label: fields.pause_step_kind,
      options: pauseStepKindOptions,
      hideBelow: 'xl',
    },
    {
      key: 'position',
      label: fields.position,
      align: 'right',
      hideBelow: '2xl',
    },
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
    {
      name: 'pause_step_kind',
      label: fields.pause_step_kind,
      kind: 'select-fixed',
      options: pauseStepKindOptions,
      visibleWhen: (values) =>
        values.use === 'pause' && Boolean(values.parent_id),
    },
    {
      name: 'position',
      label: fields.position,
      kind: 'number',
      defaultValue: 0,
    },
    {
      name: 'active',
      label: fields.active,
      kind: 'boolean',
      defaultValue: true,
    },
  ],
}
