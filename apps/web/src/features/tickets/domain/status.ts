import type { TicketStatus } from './types'

/** Etapas visibles del flujo normal; las pausas y reclamaciones se muestran como detalle. */
export const TICKET_STAGES = [
  'registered',
  'with_supervisor',
  'assigned',
  'in_progress',
  'attended',
  'closed',
] as const
export type TicketStage = (typeof TICKET_STAGES)[number]

const STAGE_BY_STATUS: Record<TicketStatus, TicketStage | null> = {
  registered: 'registered',
  with_supervisor: 'with_supervisor',
  assigned: 'assigned',
  in_progress: 'in_progress',
  paused: 'in_progress',
  attended: 'attended',
  under_claim: 'attended',
  closed: 'closed',
  rejected: null,
  cancelled: null,
  duplicate: null,
}

/** Etapa del flujo a la que pertenece un estado, o `null` si el tiquet se descartó. */
export function statusStage(status: TicketStatus): TicketStage | null {
  return STAGE_BY_STATUS[status]
}

export function stageIndex(stage: TicketStage): number {
  return TICKET_STAGES.indexOf(stage)
}

const FINAL: readonly TicketStatus[] = [
  'closed',
  'rejected',
  'cancelled',
  'duplicate',
]

/** Verdadero si el tiquet ya no admite transiciones de avance. */
export function isFinalStatus(status: TicketStatus): boolean {
  return FINAL.includes(status)
}

/** Estados que siguen en curso (bandejas y pendientes). */
export const ACTIVE_STATUSES: TicketStatus[] = [
  'registered',
  'with_supervisor',
  'assigned',
  'in_progress',
  'paused',
  'attended',
  'under_claim',
]

/** Tono visual del estado (para la insignia). */
export type StatusTone =
  'neutral' | 'progress' | 'paused' | 'done' | 'discarded'

const TONE_BY_STATUS: Record<TicketStatus, StatusTone> = {
  registered: 'neutral',
  with_supervisor: 'progress',
  assigned: 'progress',
  in_progress: 'progress',
  attended: 'progress',
  under_claim: 'progress',
  paused: 'paused',
  closed: 'done',
  rejected: 'discarded',
  cancelled: 'discarded',
  duplicate: 'discarded',
}

export function statusTone(status: TicketStatus): StatusTone {
  return TONE_BY_STATUS[status]
}
