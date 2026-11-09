import type { TicketListSearch } from '../schemas'

/** Traduce la búsqueda de la URL a los filtros que acepta la API de lista. */
export function ticketFiltersFromSearch(search: TicketListSearch) {
  return {
    status: search.status,
    buildingId: search.buildingId,
    categoryId: search.categoryId,
    teamId: search.teamId,
    priorityId: search.priorityId,
    requesterId: search.requesterId,
    technicianId: search.technicianId,
    dependencyId: search.dependencyId,
    serviceTypeId: search.serviceTypeId,
    from: search.from,
    to: search.to,
    unrouted: search.unrouted,
    possibleDuplicate: search.possibleDuplicate,
    search: search.search,
  }
}
