import type { AdminTable } from '../api/admin-api'
import { adminMessages } from '../i18n'
import type {
  AdminCatalogConfig,
  AdminColumn,
  AdminField,
} from './catalog-types'

export type {
  AdminCatalogConfig,
  AdminColumn,
  AdminField,
} from './catalog-types'

const { titles, fields, list, reasonUse, clockClass } = adminMessages

const reasonUseOptions = Object.entries(reasonUse).map(([value, label]) => ({
  value,
  label,
}))
const clockClassOptions = Object.entries(clockClass).map(([value, label]) => ({
  value,
  label,
}))

const nameField: AdminField = {
  name: 'name',
  label: fields.name,
  kind: 'text',
  required: true,
}
const activeField: AdminField = {
  name: 'active',
  label: fields.active,
  kind: 'boolean',
}
const activeColumn: AdminColumn = { key: 'active', label: list.active }
const nameColumn: AdminColumn = { key: 'name', label: fields.name }
const fullNameColumn: AdminColumn = {
  key: 'full_name',
  label: fields.full_name,
}

function simpleCatalog(
  key: string,
  table: AdminTable,
  title: string,
): AdminCatalogConfig {
  return {
    key,
    table,
    title,
    columns: [nameColumn, activeColumn],
    fields: [nameField, activeField],
  }
}

/** Catálogos administrables (Tramo 2). Todos usan el permiso `catalog.manage`. */
const teamsCatalog = simpleCatalog('teams', 'teams', titles.teams)

export const ADMIN_CATALOGS: AdminCatalogConfig[] = [
  teamsCatalog,
  simpleCatalog('buildings', 'buildings', titles.buildings),
  simpleCatalog('dependencies', 'dependencies', titles.dependencies),
  simpleCatalog('service_types', 'service_types', titles.service_types),
  simpleCatalog('channels', 'channels', titles.channels),
  {
    key: 'priorities',
    table: 'priorities',
    title: titles.priorities,
    columns: [
      nameColumn,
      { key: 'position', label: fields.position },
      activeColumn,
    ],
    fields: [
      nameField,
      { name: 'position', label: fields.position, kind: 'number' },
      { name: 'target_minutes', label: fields.target_minutes, kind: 'number' },
      activeField,
    ],
  },
  {
    key: 'locations',
    table: 'locations',
    title: titles.locations,
    columns: [
      nameColumn,
      {
        key: 'building_id',
        label: fields.building_id,
        optionsTable: 'buildings',
      },
      activeColumn,
    ],
    fields: [
      {
        name: 'building_id',
        label: fields.building_id,
        kind: 'select-table',
        optionsTable: 'buildings',
        required: true,
      },
      nameField,
      activeField,
    ],
  },
  {
    key: 'categories',
    table: 'categories',
    title: titles.categories,
    columns: [
      nameColumn,
      { key: 'team_id', label: fields.team_id, optionsTable: 'teams' },
      activeColumn,
    ],
    fields: [
      {
        name: 'team_id',
        label: fields.team_id,
        kind: 'select-table',
        optionsTable: 'teams',
        required: true,
      },
      nameField,
      activeField,
    ],
  },
  {
    key: 'subcategories',
    table: 'subcategories',
    title: titles.subcategories,
    columns: [
      nameColumn,
      {
        key: 'category_id',
        label: fields.category_id,
        optionsTable: 'categories',
      },
      activeColumn,
    ],
    fields: [
      {
        name: 'category_id',
        label: fields.category_id,
        kind: 'select-table',
        optionsTable: 'categories',
        required: true,
      },
      nameField,
      activeField,
    ],
  },
  {
    key: 'problems',
    table: 'problems',
    title: titles.problems,
    columns: [
      nameColumn,
      {
        key: 'subcategory_id',
        label: fields.subcategory_id,
        optionsTable: 'subcategories',
      },
      activeColumn,
    ],
    fields: [
      {
        name: 'subcategory_id',
        label: fields.subcategory_id,
        kind: 'select-table',
        optionsTable: 'subcategories',
        required: true,
      },
      nameField,
      activeField,
    ],
  },
  {
    key: 'requesters',
    table: 'requesters',
    title: titles.requesters,
    orderBy: 'full_name',
    columns: [
      fullNameColumn,
      { key: 'contact', label: fields.contact },
      {
        key: 'dependency_id',
        label: fields.dependency_id,
        optionsTable: 'dependencies',
      },
      activeColumn,
    ],
    fields: [
      {
        name: 'full_name',
        label: fields.full_name,
        kind: 'text',
        required: true,
      },
      { name: 'contact', label: fields.contact, kind: 'text' },
      {
        name: 'dependency_id',
        label: fields.dependency_id,
        kind: 'select-table',
        optionsTable: 'dependencies',
      },
      activeField,
    ],
  },
  {
    key: 'technicians',
    table: 'technicians',
    title: titles.technicians,
    orderBy: 'full_name',
    columns: [
      fullNameColumn,
      { key: 'team_id', label: fields.team_id, optionsTable: 'teams' },
      activeColumn,
    ],
    fields: [
      {
        name: 'full_name',
        label: fields.full_name,
        kind: 'text',
        required: true,
      },
      {
        name: 'team_id',
        label: fields.team_id,
        kind: 'select-table',
        optionsTable: 'teams',
        required: true,
      },
      activeField,
    ],
  },
  {
    key: 'reasons',
    table: 'reasons',
    title: titles.reasons,
    columns: [nameColumn, { key: 'use', label: fields.use }, activeColumn],
    fields: [
      {
        name: 'use',
        label: fields.use,
        kind: 'select-fixed',
        options: reasonUseOptions,
        required: true,
      },
      nameField,
      {
        name: 'parent_id',
        label: fields.parent_id,
        kind: 'select-table',
        optionsTable: 'reasons',
      },
      {
        name: 'requires_note',
        label: fields.requires_note,
        kind: 'boolean',
      },
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
      activeField,
    ],
  },
]

export function catalogByKey(key: string): AdminCatalogConfig {
  return ADMIN_CATALOGS.find((catalog) => catalog.key === key) ?? teamsCatalog
}

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
