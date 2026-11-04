import type { Actor } from '../auth/authorization.js'
import { can as hasPermission } from '../auth/authorization.js'
import { canAct, type TicketAccess } from '../tickets/access.js'
import type { CreateEvidenceInput } from './schemas.js'

export type EvidenceType = CreateEvidenceInput['type']

const WORK_TYPES = new Set<EvidenceType>(['before', 'during', 'after'])

function canAttachRequest(actor: Actor, access: TicketAccess): boolean {
  const ownsTicket =
    access.requesterUserId === actor.id || access.registeredBy === actor.id
  const canCreate =
    hasPermission(actor, 'ticket.create') ||
    hasPermission(actor, 'ticket.create_on_behalf')
  return ownsTicket && canCreate
}

/**
 * Autoriza la evidencia por tipo y por la acción que la justifica:
 * - `claim`: abrir una reclamación.
 * - `request`: crear el tiquet o registrarlo a nombre de otra persona.
 * - `before`/`during`/`after`: registrar el avance del trabajo.
 * - `other`: adjuntar evidencia fuera del flujo.
 * `evidence.attach` sigue habilitando cualquier tipo para supervisores y administradores.
 */
export function canAttachEvidence(
  actor: Actor,
  access: TicketAccess,
  type: EvidenceType,
): boolean {
  if (canAct(actor, 'evidence.attach', access)) return true
  if (type === 'claim') {
    return (
      canAct(actor, 'ticket.open_claim', access) ||
      canAct(actor, 'ticket.open_claim_on_behalf', access)
    )
  }
  if (type === 'request') return canAttachRequest(actor, access)
  if (WORK_TYPES.has(type)) {
    return canAct(actor, 'ticket.record_progress', access)
  }
  return false
}
