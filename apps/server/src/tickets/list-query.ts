import type { z } from 'zod'

import type { TicketFilters } from './filters.js'
import type { listTicketsQuerySchema } from './schemas.js'

type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>

/** Traduce los parámetros HTTP de la lista a los filtros del repositorio. */
export function toTicketFilters(query: ListTicketsQuery): TicketFilters {
  return {
    status: query.status,
    statuses: query.statuses,
    buildingId: query.buildingId,
    categoryId: query.categoryId,
    teamId: query.teamId,
    priorityId: query.priorityId,
    requesterId: query.requesterId,
    technicianId: query.technicianId,
    dependencyId: query.dependencyId,
    serviceTypeId: query.serviceTypeId,
    from: query.from,
    to: query.to,
    unrouted: query.unrouted,
    possibleDuplicate: query.possibleDuplicate,
    search: query.search || undefined,
  }
}
