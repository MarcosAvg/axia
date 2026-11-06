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

const ATTACHMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'application/pdf', label: 'PDF' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/webp', label: 'WebP' },
  {
    value:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word (DOCX)',
  },
  {
    value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    label: 'Excel (XLSX)',
  },
]

export const categoriesCatalog: AdminCatalogConfig = {
  key: 'categories',
  table: 'categories',
  title: titles.categories,
  columns: [
    nameColumn,
    countColumn('subcategories_count', fields.subcategories_count),
    countColumn('problems_count', fields.problems_count),
    activeColumn,
  ],
  fields: [nameField, activeField],
}

export const subcategoriesCatalog: AdminCatalogConfig = {
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
    countColumn('problems_count', fields.problems_count),
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
}

export const problemsCatalog: AdminCatalogConfig = {
  key: 'problems',
  table: 'problems',
  title: titles.problems,
  columns: [
    nameColumn,
    {
      key: 'category_name',
      label: fields.category_name,
      hideBelow: 'md',
    },
    {
      key: 'subcategory_id',
      label: fields.subcategory_id,
      optionsTable: 'subcategories',
    },
    { key: 'team_id', label: fields.team_id, optionsTable: 'teams' },
    {
      key: 'default_priority_id',
      label: fields.default_priority_id,
      optionsTable: 'priorities',
      hideBelow: 'xl',
    },
    {
      key: 'attachment_required_types',
      label: fields.attachment_required_types,
      options: ATTACHMENT_TYPE_OPTIONS,
      hideBelow: 'xl',
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
    {
      name: 'team_id',
      label: fields.team_id,
      kind: 'select-table',
      optionsTable: 'teams',
      required: true,
    },
    {
      name: 'default_priority_id',
      label: fields.default_priority_id,
      kind: 'select-table',
      optionsTable: 'priorities',
    },
    {
      name: 'attachment_required_types',
      label: fields.attachment_required_types,
      kind: 'multiselect-fixed',
      options: ATTACHMENT_TYPE_OPTIONS,
    },
    {
      name: 'attachment_instructions',
      label: fields.attachment_instructions,
      kind: 'text',
    },
    activeField,
  ],
}
