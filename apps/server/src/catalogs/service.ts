import type { Database } from '../db/client.js'
import type { CatalogName, CatalogQuery } from './names.js'
import { listCatalog } from './repository.js'

export function createCatalogService(db: Database) {
  return {
    list: (name: CatalogName, query: CatalogQuery) =>
      listCatalog(db, name, query),
  }
}

export type CatalogService = ReturnType<typeof createCatalogService>
