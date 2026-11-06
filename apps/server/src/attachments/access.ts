import type { Actor } from '../auth/authorization.js'
import { can as hasPermission } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { findVisibleTicket } from '../tickets/repository.js'
import type { CreateAttachmentInput } from './schemas.js'

function forbidden(): AppError {
  return new AppError(
    403,
    'forbidden',
    'No tienes permiso para adjuntar archivos',
  )
}

/**
 * Autoriza la reserva de un adjunto:
 * - sin `ticketId`, es un alta y exige permiso de creación;
 * - con `ticketId`, es una recaptura y exige visibilidad y permiso de recaptura.
 * La acción final vuelve a validar sus propias precondiciones.
 */
export async function assertCanReserveAttachment(
  db: Database,
  actor: Actor,
  input: Pick<CreateAttachmentInput, 'ticketId'>,
): Promise<void> {
  if (input.ticketId) {
    if (!hasPermission(actor, 'ticket.recapture')) throw forbidden()
    if (!(await findVisibleTicket(db, actor, input.ticketId))) {
      throw new AppError(404, 'not_found', 'Tiquet no encontrado')
    }
    return
  }
  const canCreate =
    hasPermission(actor, 'ticket.create') ||
    hasPermission(actor, 'ticket.create_on_behalf')
  if (!canCreate) throw forbidden()
}
