// Tipos y uniones del núcleo de tiquets. Los valores viven también en la base
// (enums); aquí se repiten como tuplas para poder validar en el cliente.

export const TICKET_STATUSES = [
  'registered',
  'with_supervisor',
  'assigned',
  'in_progress',
  'paused',
  'attended',
  'under_claim',
  'closed',
  'rejected',
  'cancelled',
  'duplicate',
] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const EVIDENCE_TYPES = [
  'request',
  'before',
  'during',
  'after',
  'claim',
  'other',
] as const
export type EvidenceType = (typeof EVIDENCE_TYPES)[number]

export const EVENT_TYPES = [
  'created',
  'offered',
  'taken',
  'reassigned_supervisor',
  'assigned_technician',
  'reassigned_technician',
  'auxiliary_added',
  'capture_recaptured',
  'started',
  'paused',
  'pause_advanced',
  'resumed',
  'attended',
  'validated',
  'claim_opened',
  'claim_resolved',
  'reopened',
  'rejected',
  'cancelled',
  'duplicate_marked',
  'reactivated',
  'priority_changed',
  'comment',
  'evidence_added',
  'manual_time_recorded',
  'rated',
  'imported',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const TIME_SPAN_KINDS = [
  'supervisor_response',
  'reassignment',
  'technician_assignment',
  'recapture',
  'wait_start',
  'active_work',
  'pause',
  'validation',
  'claim',
  'duplicate_review',
] as const
export type TimeSpanKind = (typeof TIME_SPAN_KINDS)[number]

export const CLOCK_CLASSES = ['counted', 'not_counted'] as const
export type ClockClass = (typeof CLOCK_CLASSES)[number]

/** Tramo de tiempo registrado a mano por supervisor o administrador (RN §13). */
export interface ManualTimeSpan {
  id: string
  kind: TimeSpanKind
  startedAt: string
  endedAt: string | null
  clockClass: ClockClass
  subjectTechnicianName: string | null
  voidedAt: string | null
}

/** Calificación de satisfacción de un tiquet (1-5, opcional). */
export interface TicketRating {
  score: number
  comment: string | null
}

export type ClaimResolution = 'upheld' | 'dismissed' | 'new_ticket'
export const CLAIM_RESOLUTIONS: ClaimResolution[] = [
  'upheld',
  'dismissed',
  'new_ticket',
]

export interface TicketListItem {
  id: string
  folio: string
  status: TicketStatus
  reportedAt: string
  closedAt: string | null
  description: string
  requesterName: string
  possibleDuplicate: boolean
  buildingName: string | null
  categoryName: string | null
  priorityName: string | null
  teamName: string | null
}

export interface TicketDetail extends TicketListItem {
  cycle: number
  buildingId: string
  locationId: string
  dependencyId: string
  categoryId: string
  subcategoryId: string | null
  problemId: string | null
  serviceTypeId: string | null
  priorityId: string
  locationName: string | null
  dependencyName: string | null
  subcategoryName: string | null
  problemName: string | null
  serviceTypeName: string | null
  channelName: string | null
  requesterContact: string | null
  duplicateOfId: string | null
}

export interface TicketTimelineItem {
  id: number
  cycle: number
  type: EventType
  occurredAt: string
  actorName: string | null
  subjectTechnicianName: string | null
  reasonName: string | null
  payload: Record<string, unknown>
}

export interface TicketPauseStep {
  pauseId: string
  reasonId: string
  reasonName: string
  enteredAt: string
  exitedAt: string | null
  note: string | null
  actorName: string | null
}

export interface TicketPauseState {
  pauseId: string
  motiveId: string
  motiveName: string
  currentId: string
  currentName: string
  openedAt: string
}

export interface TicketParticipant {
  technicianId: string
  technicianName: string
  participationType: 'leader' | 'auxiliary'
  startedAt: string
  endedAt: string | null
}

export interface TicketEvidenceItem {
  id: string
  type: EvidenceType
  storagePath: string | null
  mimeType: string | null
  sizeBytes: number | null
  occurredAt: string
}

export interface DuplicateCandidate {
  folio?: string
  status?: TicketStatus
  reported_at?: string
  building?: string | null
  problem?: string | null
  requester_contact?: string | null
}

export interface SupervisorOption {
  id: string
  fullName: string
}
