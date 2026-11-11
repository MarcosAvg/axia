import type { CatalogKey } from '../domain/catalog-import'

type ImportCatalog = CatalogKey | 'pause_transitions'

export interface ImportIssue {
  catalog: ImportCatalog
  row: number
  messages: string[]
}

export interface ImportReport {
  catalog: ImportCatalog
  title: string
  total: number
  inserted: number
  updated: number
  invalid: number
  errors: number
}
