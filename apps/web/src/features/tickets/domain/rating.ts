import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import type { ProxySubject } from './actions'
import type { TicketStatus } from './types'

/** Calificación disponible al cerrar o cuando el solicitante ya validó. */
export function canRateTicket({
  identity,
  status,
  requesterValidated,
  isRequester,
  subject,
}: {
  identity: Identity | null
  status: TicketStatus
  requesterValidated: boolean
  isRequester: boolean
  subject: ProxySubject
}): boolean {
  if (status !== 'closed' && !(status === 'attended' && requesterValidated)) {
    return false
  }
  if (subject?.kind === 'requester') {
    return can(identity, 'ticket.rate_on_behalf')
  }
  if (subject?.kind === 'technician') return false
  return isRequester && can(identity, 'ticket.rate')
}
