import {
  categoriesCatalog,
  problemsCatalog,
  subcategoriesCatalog,
} from './catalogs-classification'
import {
  buildingsCatalog,
  channelsCatalog,
  dependenciesCatalog,
  locationsCatalog,
  prioritiesCatalog,
  serviceTypesCatalog,
  teamsCatalog,
} from './catalogs-masters'
import { requestersCatalog, techniciansCatalog } from './catalogs-people'
import { reasonsCatalog } from './catalogs-reasons'
import type { AdminCatalogConfig } from './catalog-types'

export type {
  AdminCatalogConfig,
  AdminColumn,
  AdminField,
} from './catalog-types'

/** Catálogos administrables. Todos usan el permiso `catalog.manage`. */
export const ADMIN_CATALOGS: AdminCatalogConfig[] = [
  teamsCatalog,
  buildingsCatalog,
  dependenciesCatalog,
  serviceTypesCatalog,
  channelsCatalog,
  prioritiesCatalog,
  locationsCatalog,
  categoriesCatalog,
  subcategoriesCatalog,
  problemsCatalog,
  requestersCatalog,
  techniciansCatalog,
  reasonsCatalog,
]

export function catalogByKey(key: string): AdminCatalogConfig {
  return ADMIN_CATALOGS.find((catalog) => catalog.key === key) ?? teamsCatalog
}
