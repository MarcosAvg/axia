// Adaptador de la hoja heredada: filas crudas -> candidatos normalizados (sin resolver aún).

import { canonicalRow, parseSourceDate } from '../domain/sheet'

export type CatalogName =
  | 'building'
  | 'location'
  | 'dependency'
  | 'category'
  | 'subcategory'
  | 'problem'
  | 'serviceType'
  | 'priority'
  | 'technician'
  | 'channel'
  | 'requester'

export const CATALOG_NAMES: CatalogName[] = [
  'building',
  'location',
  'dependency',
  'category',
  'subcategory',
  'problem',
  'serviceType',
  'priority',
  'technician',
  'channel',
  'requester',
]

/** Catálogo (tabla genérica) al que apunta cada nombre de la hoja. */
export const CATALOG_BY_NAME: Record<CatalogName, string> = {
  building: 'buildings',
  location: 'locations',
  dependency: 'dependencies',
  category: 'categories',
  subcategory: 'subcategories',
  problem: 'problems',
  serviceType: 'service_types',
  priority: 'priorities',
  technician: 'technicians',
  channel: 'channels',
  requester: 'requesters',
}

export const CATALOG_LABEL: Record<CatalogName, string> = {
  building: 'Edificio',
  location: 'Ubicación',
  dependency: 'Dependencia',
  category: 'Categoría',
  subcategory: 'Subcategoría',
  problem: 'Problema',
  serviceType: 'Tipo de servicio',
  priority: 'Prioridad',
  technician: 'Técnico',
  channel: 'Canal',
  requester: 'Solicitante',
}

export interface Candidate {
  externalId: string | null
  platformId: string | null
  description: string | null
  statusText: string | null
  reportedAt: string | null
  assignedAt: string | null
  finishedAt: string | null
  contact: string | null
  extension: string | null
  names: Record<CatalogName, string | null>
}

/** Convierte las filas crudas en candidatos normalizados (fechas en la zona configurada). */
export function toCandidates(
  rows: Record<string, unknown>[],
  timeZone: string,
): Candidate[] {
  return rows.map((raw) => {
    const row = canonicalRow(raw)
    return {
      externalId: row.externalId,
      platformId: row.platformId,
      description: row.description,
      statusText: row.status,
      reportedAt: parseSourceDate(row.reportedAt, timeZone),
      assignedAt: parseSourceDate(row.assignedAt, timeZone),
      finishedAt: parseSourceDate(row.finishedAt, timeZone),
      contact: row.contact,
      extension: row.extension,
      names: {
        building: row.building,
        location: row.location,
        dependency: row.dependency,
        category: row.category,
        subcategory: row.subcategory,
        problem: row.problem,
        serviceType: row.serviceType,
        priority: row.priority,
        technician: row.technician,
        channel: row.channel,
        requester: row.contact,
      },
    }
  })
}
