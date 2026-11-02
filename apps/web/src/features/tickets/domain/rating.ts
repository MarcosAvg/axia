import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import type { TicketStatus } from './types'

/** Calificación disponible al cerrar o cuando el solicitante ya validó. */
export function canRateTicket(
  identity: Identity | null,
  status: TicketStatus,
  requesterValidated: boolean,
): boolean {
  if (status !== 'closed' && !(status === 'attended' && requesterValidated)) {
    return false
  }
  return can(identity, 'ticket.rate') || can(identity, 'ticket.rate_on_behalf')
}
