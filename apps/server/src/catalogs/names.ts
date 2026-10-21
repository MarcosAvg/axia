export const CATALOG_NAMES = [
  'teams',
  'buildings',
  'dependencies',
  'service-types',
  'channels',
  'priorities',
  'locations',
  'categories',
  'subcategories',
  'problems',
  'requesters',
  'technicians',
  'reasons',
] as const

export type CatalogName = (typeof CATALOG_NAMES)[number]

export const REASON_USES = [
  'pause',
  'rejection',
  'cancellation',
  'supervisor_reassignment',
  'technician_reassignment',
  'recapture',
  'claim',
  'claim_outcome',
  'reactivation',
  'auxiliary_support',
] as const

type ReasonUse = (typeof REASON_USES)[number]

export type CatalogQuery = {
  buildingId?: string
  categoryId?: string
  subcategoryId?: string
  use?: ReasonUse
}
