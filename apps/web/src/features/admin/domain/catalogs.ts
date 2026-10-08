import type { AdminTable } from '../api/admin-api'
import { adminMessages } from '../i18n'
import { reasonsCatalog } from './catalogs-reasons'
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

const { titles, fields, list } = adminMessages

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
const teamsCatalog: AdminCatalogConfig = {
  key: 'teams',
  table: 'teams',
  title: titles.teams,
  columns: [
    nameColumn,
    {
      key: 'work_calendar_id',
      label: fields.work_calendar_id,
      optionsTable: 'work_calendars',
    },
    activeColumn,
  ],
  fields: [
    nameField,
    {
      name: 'work_calendar_id',
      label: fields.work_calendar_id,
      kind: 'select-table',
      optionsTable: 'work_calendars',
    },
    activeField,
  ],
}

export const ADMIN_CATALOGS: AdminCatalogConfig[] = [
  teamsCatalog,
  simpleCatalog('buildings', 'buildings', titles.buildings),
  simpleCatalog('dependencies', 'dependencies', titles.dependencies),
  {
    key: 'service_types',
    table: 'service_types',
    title: titles.service_types,
    columns: [
      nameColumn,
      {
        key: 'target_minutes',
        label: fields.target_minutes,
        format: 'minutes',
      },
      activeColumn,
    ],
    fields: [
      nameField,
      { name: 'target_minutes', label: fields.target_minutes, kind: 'minutes' },
      activeField,
    ],
  },
  simpleCatalog('channels', 'channels', titles.channels),
  {
    key: 'priorities',
    table: 'priorities',
    title: titles.priorities,
    columns: [
      nameColumn,
      { key: 'position', label: fields.position },
      {
        key: 'target_minutes',
        label: fields.target_minutes,
        format: 'minutes',
      },
      activeColumn,
    ],
    fields: [
      nameField,
      { name: 'position', label: fields.position, kind: 'number' },
      { name: 'target_minutes', label: fields.target_minutes, kind: 'minutes' },
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
  reasonsCatalog,
]

export function catalogByKey(key: string): AdminCatalogConfig {
  return ADMIN_CATALOGS.find((catalog) => catalog.key === key) ?? teamsCatalog
}
