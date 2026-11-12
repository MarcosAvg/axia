import type {
  DemoTicket,
  DemoTicketStatus,
  DemoTicketTimes,
  TechnicianKey,
} from './data.js'
import {
  CANCELLATION_REASONS,
  CLAIM_REASONS,
  PAUSE_HISTORY_STATUSES,
  RECAPTURE_REASONS,
  REJECTION_REASONS,
  SUPERVISOR_REASSIGNMENT_REASONS,
  SUPERVISOR_REASSIGNMENT_STATUSES,
  TECHNICIAN_REASSIGNMENT_REASONS,
} from './generate-catalog.js'
import {
  closedPause,
  discardAfter,
  openPause,
  ratingScore,
} from './generate-times.js'
import { between, integer, shuffle, weighted, type Rng } from './random.js'

export type ScenarioState = {
  reopenCount: number
  recaptureCount: number
  reassignmentCount: number
  supervisorReassignmentCount: number
  auxiliaryCount: number
  evidenceCount: number
  ratingCount: number
  candidateCount: number
}

type Category = { technicians: TechnicianKey[] }

const ALL_TECHNICIANS: TechnicianKey[] = [
  'lead',
  'second',
  'security',
  'climate',
  'electrical',
]

const CANDIDATE_DECISIONS = [null, 'dismissed', 'ignored', null] as const

function timesOf(ticket: DemoTicket) {
  return ticket.times as DemoTicketTimes
}

function applyReopen(ticket: DemoTicket, rnd: Rng, state: ScenarioState) {
  if (ticket.status !== 'closed' || state.reopenCount >= 8) return
  const times = timesOf(ticket)
  const claimAfter = times.validatedAfterHours + between(rnd, 1, 24)
  const resolvedAt = claimAfter + between(rnd, 1, 72)
  ticket.reopen = {
    claimAfterHours: claimAfter,
    resolveAfterHours: resolvedAt,
    startedAfterHours: resolvedAt + between(rnd, 0.3, 2),
    attendedAfterHours: resolvedAt + between(rnd, 2, 8),
    validatedAfterHours: resolvedAt + between(rnd, 8, 40),
    technician: ticket.technician,
    claimReason: CLAIM_REASONS[
      state.reopenCount % CLAIM_REASONS.length
    ] as string,
    description: 'La falla regresó después del cierre.',
  }
  state.reopenCount += 1
}

function applyRating(ticket: DemoTicket, rnd: Rng, state: ScenarioState) {
  if (ticket.status !== 'closed' || rnd() >= 0.68) return
  const times = timesOf(ticket)
  ticket.rating = ratingScore(rnd, state.ratingCount)
  ticket.ratingAfterHours = times.validatedAfterHours + between(rnd, 1, 72)
  state.ratingCount += 1
}

function applyClosedScenario(
  ticket: DemoTicket,
  rnd: Rng,
  state: ScenarioState,
) {
  applyReopen(ticket, rnd, state)
  applyRating(ticket, rnd, state)
}

function applyUnderClaim(ticket: DemoTicket, rnd: Rng) {
  if (ticket.status !== 'under_claim') return
  const times = timesOf(ticket)
  ticket.claimAfterHours = times.attendedAfterHours + between(rnd, 0.5, 20)
  ticket.claimReason = CLAIM_REASONS[integer(rnd, 0, CLAIM_REASONS.length - 1)]
  ticket.claimDescription = 'El trabajo quedó incompleto en la revisión.'
}

function discardedFrom(rnd: Rng, status: DemoTicketStatus): DemoTicketStatus {
  if (status === 'duplicate') {
    return weighted(rnd, [
      ['registered', 40],
      ['with_supervisor', 35],
      ['assigned', 25],
    ])
  }
  return weighted(rnd, [
    ['registered', 30],
    ['with_supervisor', 25],
    ['assigned', 25],
    ['in_progress', 20],
  ])
}

function applyDiscard(ticket: DemoTicket, rnd: Rng) {
  if (!['rejected', 'cancelled', 'duplicate'].includes(ticket.status)) return
  const from = discardedFrom(rnd, ticket.status)
  ticket.discardedFrom = from
  ticket.discardAfterHours = discardAfter(
    rnd,
    ticket.status,
    from,
    timesOf(ticket),
  )
  if (ticket.status === 'rejected') {
    ticket.discardReason =
      REJECTION_REASONS[integer(rnd, 0, REJECTION_REASONS.length - 1)]
  }
  if (ticket.status === 'cancelled') {
    ticket.discardReason =
      CANCELLATION_REASONS[integer(rnd, 0, CANCELLATION_REASONS.length - 1)]
  }
}

function extendAfterPause(ticket: DemoTicket, pauseClosed: number, rnd: Rng) {
  const times = timesOf(ticket)
  if (pauseClosed < times.attendedAfterHours) return
  const attended = pauseClosed + between(rnd, 0.5, 2)
  const validated = Math.max(
    attended + between(rnd, 0.5, 4),
    times.validatedAfterHours,
  )
  ticket.times = {
    ...times,
    attendedAfterHours: attended,
    validatedAfterHours: validated,
  }
}

function applyPause(ticket: DemoTicket, rnd: Rng) {
  const times = timesOf(ticket)
  if (ticket.status === 'paused') {
    ticket.pauses = [openPause(rnd, times)]
    return
  }
  if (!PAUSE_HISTORY_STATUSES.includes(ticket.status) || rnd() >= 0.22) return
  const pause = closedPause(rnd, times)
  ticket.pauses = [pause]
  if (pause.closedAfterHours !== undefined) {
    extendAfterPause(ticket, pause.closedAfterHours, rnd)
  }
}

function applyRecapture(ticket: DemoTicket, rnd: Rng, state: ScenarioState) {
  if (
    state.recaptureCount >= 10 ||
    !['registered', 'with_supervisor', 'assigned'].includes(ticket.status)
  ) {
    return
  }
  ticket.recapture = {
    afterHours: between(rnd, 0.2, 1.5),
    reason: RECAPTURE_REASONS[
      state.recaptureCount % RECAPTURE_REASONS.length
    ] as string,
  }
  state.recaptureCount += 1
}

function applySupervisorReassignment(
  ticket: DemoTicket,
  rnd: Rng,
  state: ScenarioState,
) {
  if (state.supervisorReassignmentCount >= 8) return
  if (!SUPERVISOR_REASSIGNMENT_STATUSES.includes(ticket.status)) return
  const times = timesOf(ticket)
  ticket.supervisorReassignment = {
    afterHours: times.takenAfterHours + between(rnd, 0.1, 0.8),
    reason: SUPERVISOR_REASSIGNMENT_REASONS[
      state.supervisorReassignmentCount % SUPERVISOR_REASSIGNMENT_REASONS.length
    ] as string,
  }
  state.supervisorReassignmentCount += 1
}

function applyTechnicianReassignment(
  ticket: DemoTicket,
  rnd: Rng,
  state: ScenarioState,
  category: Category,
) {
  if (state.reassignmentCount >= 12 || category.technicians.length < 2) return
  if (
    ![
      'assigned',
      'in_progress',
      'paused',
      'attended',
      'closed',
      'under_claim',
    ].includes(ticket.status)
  ) {
    return
  }
  const replacement = category.technicians.find(
    (entry) => entry !== ticket.technician,
  )
  if (!replacement) return
  ticket.reassignment = {
    afterHours: timesOf(ticket).assignedAfterHours + between(rnd, 0.1, 0.7),
    technician: replacement,
    reason: TECHNICIAN_REASSIGNMENT_REASONS[
      state.reassignmentCount % TECHNICIAN_REASSIGNMENT_REASONS.length
    ] as string,
  }
  state.reassignmentCount += 1
}

function applyAuxiliary(ticket: DemoTicket, rnd: Rng, state: ScenarioState) {
  if (state.auxiliaryCount >= 12) return
  if (
    !['in_progress', 'paused', 'attended', 'closed', 'under_claim'].includes(
      ticket.status,
    )
  ) {
    return
  }
  ticket.auxiliary = shuffle(rnd, ALL_TECHNICIANS).find(
    (entry) =>
      entry !== ticket.technician && entry !== ticket.reassignment?.technician,
  )
  state.auxiliaryCount += 1
}

function applyEvidence(ticket: DemoTicket, state: ScenarioState) {
  if (state.evidenceCount >= 20) return
  if (
    !['in_progress', 'paused', 'attended', 'closed', 'under_claim'].includes(
      ticket.status,
    )
  ) {
    return
  }
  ticket.evidence = true
  state.evidenceCount += 1
}

function applyDuplicate(
  ticket: DemoTicket,
  index: number,
  linkableIds: string[],
) {
  if (ticket.status !== 'duplicate') return
  const original = linkableIds[index % linkableIds.length]
  if (!original) return
  ticket.duplicateOf = original
  ticket.duplicateCandidateOf = original
  ticket.duplicateCandidateDecision = 'linked'
}

function applyCandidate(
  ticket: DemoTicket,
  index: number,
  linkableIds: string[],
  state: ScenarioState,
) {
  if (
    ticket.status === 'duplicate' ||
    state.candidateCount >= 8 ||
    linkableIds.length === 0
  ) {
    return
  }
  const original = linkableIds[(index + 3) % linkableIds.length]
  if (!original) return
  ticket.duplicateCandidateOf = original
  ticket.duplicateCandidateDecision =
    CANDIDATE_DECISIONS[state.candidateCount % CANDIDATE_DECISIONS.length] ??
    null
  state.candidateCount += 1
}

export function applyScenarios(input: {
  ticket: DemoTicket
  rnd: Rng
  state: ScenarioState
  index: number
  linkableIds: string[]
  category: Category
}) {
  const { ticket, rnd, state, index, linkableIds, category } = input
  applyClosedScenario(ticket, rnd, state)
  applyUnderClaim(ticket, rnd)
  applyDiscard(ticket, rnd)
  applyPause(ticket, rnd)
  applyRecapture(ticket, rnd, state)
  applySupervisorReassignment(ticket, rnd, state)
  applyTechnicianReassignment(ticket, rnd, state, category)
  applyAuxiliary(ticket, rnd, state)
  applyEvidence(ticket, state)
  applyDuplicate(ticket, index, linkableIds)
  applyCandidate(ticket, index, linkableIds, state)
}
