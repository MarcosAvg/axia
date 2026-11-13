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
    subcategoryId: query.subcategoryId,
    problemId: query.problemId,
    locationId: query.locationId,
    channelId: query.channelId,
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
    outcome: query.outcome,
    sla: query.sla,
    slaClock: query.slaClock,
    rating: query.rating,
    reassigned: query.reassigned,
    recaptured: query.recaptured,
    reopened: query.reopened,
    firstFix: query.firstFix,
    unverifiedTime: query.unverifiedTime,
    pauseReasonId: query.pauseReasonId,
    pauseSubstateId: query.pauseSubstateId,
    terminalReasonId: query.terminalReasonId,
    pendingOffer: query.pendingOffer,
    participantTechnicianId: query.participantTechnicianId,
    phase: query.phase,
    timeMode: query.timeMode,
    phaseMinutesMin: query.phaseMinutesMin,
    phaseMinutesMax: query.phaseMinutesMax,
    phaseOutsideLow: query.phaseOutsideLow,
    phaseOutsideHigh: query.phaseOutsideHigh,
  }
}
