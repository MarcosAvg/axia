import type { TicketListSearch } from '../schemas'

/** Filtros que solo existen en la API y llegan desde un desglose de Métricas. */
const INHERITED_KEYS = [
  'statuses',
  'subcategoryId',
  'problemId',
  'locationId',
  'channelId',
  'outcome',
  'sla',
  'slaClock',
  'rating',
  'reassigned',
  'recaptured',
  'reopened',
  'firstFix',
  'unverifiedTime',
  'pauseReasonId',
  'pauseSubstateId',
  'terminalReasonId',
  'pendingOffer',
  'participantTechnicianId',
  'phase',
  'timeMode',
  'phaseMinutesMin',
  'phaseMinutesMax',
  'phaseOutsideLow',
  'phaseOutsideHigh',
] as const satisfies readonly (keyof TicketListSearch)[]

export function hasInheritedTicketFilters(search: TicketListSearch): boolean {
  return INHERITED_KEYS.some((key) => {
    if (key === 'slaClock') {
      return search.sla !== undefined && search.slaClock !== undefined
    }
    return search[key] !== undefined
  })
}

export function withoutInheritedTicketFilters(
  search: TicketListSearch,
): TicketListSearch {
  const next: Record<string, unknown> = { ...search }
  for (const key of INHERITED_KEYS) delete next[key]
  return next as TicketListSearch
}

/** Traduce la búsqueda de la URL a los filtros que acepta la API de lista. */
export function ticketFiltersFromSearch(search: TicketListSearch) {
  return {
    status: search.status,
    statuses: search.statuses,
    buildingId: search.buildingId,
    categoryId: search.categoryId,
    subcategoryId: search.subcategoryId,
    problemId: search.problemId,
    locationId: search.locationId,
    channelId: search.channelId,
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
    outcome: search.outcome,
    sla: search.sla,
    slaClock: search.slaClock,
    rating: search.rating,
    reassigned: search.reassigned,
    recaptured: search.recaptured,
    reopened: search.reopened,
    firstFix: search.firstFix,
    unverifiedTime: search.unverifiedTime,
    pauseReasonId: search.pauseReasonId,
    pauseSubstateId: search.pauseSubstateId,
    terminalReasonId: search.terminalReasonId,
    pendingOffer: search.pendingOffer,
    participantTechnicianId: search.participantTechnicianId,
    phase: search.phase,
    timeMode: search.timeMode,
    phaseMinutesMin: search.phaseMinutesMin,
    phaseMinutesMax: search.phaseMinutesMax,
    phaseOutsideLow: search.phaseOutsideLow,
    phaseOutsideHigh: search.phaseOutsideHigh,
  }
}
