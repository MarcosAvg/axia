import type { TicketStatus } from './types'

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
