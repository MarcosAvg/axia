import type { CatalogKey } from '../domain/catalog-import'

export interface ImportIssue {
  catalog: CatalogKey
  row: number
  messages: string[]
}

export interface ImportReport {
  catalog: CatalogKey
  title: string
  total: number
  inserted: number
  updated: number
  invalid: number
  errors: number
}
