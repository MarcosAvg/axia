import type { CatalogKey } from '../domain/catalog-import'

export interface ImportIssue {
  catalog: CatalogKey | 'dependency_locations'
  row: number
  messages: string[]
}

export interface ImportReport {
  catalog: CatalogKey | 'dependency_locations'
  title: string
  total: number
  inserted: number
  updated: number
  invalid: number
  errors: number
}
