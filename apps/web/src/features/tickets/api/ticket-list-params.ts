import type { TicketStatus } from '../domain/types'

export interface TicketFilters {
  status?: TicketStatus
  statuses?: TicketStatus[]
  buildingId?: string
  categoryId?: string
  subcategoryId?: string
  problemId?: string
  locationId?: string
  channelId?: string
  teamId?: string
  priorityId?: string
  requesterId?: string
  technicianId?: string
  dependencyId?: string
  serviceTypeId?: string
  from?: string
  to?: string
  unrouted?: boolean
  possibleDuplicate?: boolean
  search?: string
  outcome?: string
  sla?: 'met' | 'missed' | 'with_target'
  slaClock?: 'calendar' | 'laboral'
  rating?: number
  reassigned?: boolean
  recaptured?: boolean
  reopened?: boolean
  firstFix?: boolean
  unverifiedTime?: boolean
  pauseReasonId?: string
  pauseSubstateId?: string
  terminalReasonId?: string
  pendingOffer?: boolean
  participantTechnicianId?: string
  phase?: string
  timeMode?: 'calendar' | 'laboral'
}

function queryString(
  params: Record<string, string | number | boolean | undefined>,
) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  return search.toString()
}

/** Parámetros HTTP de la lista, incluidos los filtros de desglose de métricas. */
export function ticketListQuery(
  filters: TicketFilters,
  page: number,
  pageSize: number,
) {
  return queryString({
    status: filters.status,
    statuses: filters.statuses?.join(','),
    buildingId: filters.buildingId,
    categoryId: filters.categoryId,
    subcategoryId: filters.subcategoryId,
    problemId: filters.problemId,
    locationId: filters.locationId,
    channelId: filters.channelId,
    teamId: filters.teamId,
    priorityId: filters.priorityId,
    requesterId: filters.requesterId,
    technicianId: filters.technicianId,
    dependencyId: filters.dependencyId,
    serviceTypeId: filters.serviceTypeId,
    from: filters.from,
    to: filters.to,
    unrouted: filters.unrouted ? true : undefined,
    possibleDuplicate: filters.possibleDuplicate ? true : undefined,
    search: filters.search,
    outcome: filters.outcome,
    sla: filters.sla,
    slaClock: filters.slaClock,
    rating: filters.rating,
    reassigned: filters.reassigned ? true : undefined,
    recaptured: filters.recaptured ? true : undefined,
    reopened: filters.reopened ? true : undefined,
    firstFix: filters.firstFix ? true : undefined,
    unverifiedTime: filters.unverifiedTime ? true : undefined,
    pauseReasonId: filters.pauseReasonId,
    pauseSubstateId: filters.pauseSubstateId,
    terminalReasonId: filters.terminalReasonId,
    pendingOffer: filters.pendingOffer ? true : undefined,
    participantTechnicianId: filters.participantTechnicianId,
    phase: filters.phase,
    timeMode: filters.timeMode,
    page,
    pageSize,
  })
}
