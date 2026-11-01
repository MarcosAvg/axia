import { adminMessages } from '../i18n'
import type { AdminCatalogConfig } from './catalog-types'
import {
  activeColumn,
  activeField,
  countColumn,
  fullNameColumn,
} from './catalog-fields'

const { titles, fields } = adminMessages

export const requestersCatalog: AdminCatalogConfig = {
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
    { key: 'user_label', label: fields.user_label, format: 'account' },
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
}

export const techniciansCatalog: AdminCatalogConfig = {
  key: 'technicians',
  table: 'technicians',
  title: titles.technicians,
  orderBy: 'full_name',
  columns: [
    fullNameColumn,
    { key: 'team_id', label: fields.team_id, optionsTable: 'teams' },
    { key: 'user_label', label: fields.user_label, format: 'account' },
    countColumn('categories_count', fields.categories_count),
    {
      key: 'category_names',
      label: fields.category_names,
      truncate: true,
      hideBelow: 'xl',
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
    {
      name: 'team_id',
      label: fields.team_id,
      kind: 'select-table',
      optionsTable: 'teams',
      required: true,
    },
    activeField,
  ],
}
