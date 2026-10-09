import type { ActionKey } from './actions'
import type { EvidenceType, TicketStatus } from './types'

/**
 * Tipos de evidencia válidos para el estado actual del tiquet. Refleja la regla del backend
 * (`evidence_add`) y guía el subidor y las acciones del detalle.
 */
const ALLOWED: Record<TicketStatus, EvidenceType[]> = {
  registered: ['request', 'other'],
  with_supervisor: ['other'],
  assigned: ['before', 'other'],
  in_progress: ['during', 'after', 'other'],
  paused: ['during', 'after', 'other'],
  attended: ['claim', 'other'],
  under_claim: ['claim', 'other'],
  closed: ['claim'],
  rejected: [],
  cancelled: [],
  duplicate: [],
}

export function allowedEvidenceTypes(status: TicketStatus): EvidenceType[] {
  return ALLOWED[status]
}

/** Tipo de evidencia que exige una acción del flujo, si aplica. */
const EVIDENCE_BY_ACTION: Partial<Record<ActionKey, EvidenceType>> = {
  start: 'before',
  attend: 'after',
  open_claim: 'claim',
}

export function evidenceForAction(action: ActionKey): EvidenceType | undefined {
  return EVIDENCE_BY_ACTION[action]
}
