import { adminMessages } from '../i18n'
import type { AdminCatalogConfig } from './catalog-types'
import {
  activeColumn,
  activeField,
  countColumn,
  nameColumn,
  nameField,
} from './catalog-fields'

const { titles, fields } = adminMessages

export const teamsCatalog: AdminCatalogConfig = {
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
    countColumn('technicians_count', fields.technicians_count),
    countColumn('problems_count', fields.problems_count, 'xl'),
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

export const buildingsCatalog: AdminCatalogConfig = {
  key: 'buildings',
  table: 'buildings',
  title: titles.buildings,
  columns: [
    nameColumn,
    countColumn('locations_count', fields.locations_count),
    countColumn('dependencies_count', fields.dependencies_count, 'xl'),
    activeColumn,
  ],
  fields: [nameField, activeField],
}

export const dependenciesCatalog: AdminCatalogConfig = {
  key: 'dependencies',
  table: 'dependencies',
  title: titles.dependencies,
  columns: [
    nameColumn,
    countColumn('locations_count', fields.locations_count),
    countColumn('buildings_count', fields.buildings_count),
    {
      key: 'building_names',
      label: fields.building_names,
      truncate: true,
      hideBelow: 'xl',
    },
    activeColumn,
  ],
  fields: [nameField, activeField],
}

export const locationsCatalog: AdminCatalogConfig = {
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
    countColumn('dependencies_count', fields.dependencies_count, 'lg'),
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
}

export const serviceTypesCatalog: AdminCatalogConfig = {
  key: 'service_types',
  table: 'service_types',
  title: titles.service_types,
  columns: [
    nameColumn,
    {
      key: 'target_minutes',
      label: fields.target_minutes,
      format: 'minutes',
      align: 'right',
    },
    activeColumn,
  ],
  fields: [
    nameField,
    { name: 'target_minutes', label: fields.target_minutes, kind: 'minutes' },
    activeField,
  ],
}

export const channelsCatalog: AdminCatalogConfig = {
  key: 'channels',
  table: 'channels',
  title: titles.channels,
  columns: [
    nameColumn,
    { key: 'is_platform', label: fields.is_platform },
    activeColumn,
  ],
  fields: [
    nameField,
    { name: 'is_platform', label: fields.is_platform, kind: 'boolean' },
    activeField,
  ],
}

export const prioritiesCatalog: AdminCatalogConfig = {
  key: 'priorities',
  table: 'priorities',
  title: titles.priorities,
  columns: [
    nameColumn,
    { key: 'position', label: fields.position, align: 'right' },
    {
      key: 'target_minutes',
      label: fields.target_minutes,
      format: 'minutes',
      align: 'right',
    },
    activeColumn,
  ],
  fields: [
    nameField,
    {
      name: 'position',
      label: fields.position,
      kind: 'number',
      defaultValue: 0,
    },
    { name: 'target_minutes', label: fields.target_minutes, kind: 'minutes' },
    activeField,
  ],
}
