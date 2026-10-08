import type { AdminTable } from '../api/admin-api'

type AdminFieldKind =
  'text' | 'number' | 'boolean' | 'select-table' | 'select-fixed'

export interface AdminField {
  name: string
  label: string
  kind: AdminFieldKind
  required?: boolean
  optionsTable?: AdminTable
  options?: { value: string; label: string }[]
}

export interface AdminColumn {
  key: string
  label: string
  optionsTable?: AdminTable
}

export interface AdminCatalogConfig {
  key: string
  table: AdminTable
  title: string
  orderBy?: string
  columns: AdminColumn[]
  fields: AdminField[]
}
