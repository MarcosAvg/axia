// Cola de acciones del tiquet: cuando no hay conexión, la acción se encola y se
// reenvía al recuperar la red (mismo `client_request_id` para idempotencia).

import { enqueue, registerOutboxHandler } from '@/lib/offline/outbox'
import { TICKET_OPERATIONS } from './ticket-operations'
import type { TicketOperation } from './ticket-operations'

const TICKET_ACTION = 'ticket_action'

interface TicketActionPayload {
  operation: TicketOperation
  ticketId: string
  args: Record<string, unknown>
  clientRequestId: string
}

export async function enqueueTicketAction(
  operation: TicketOperation,
  ticketId: string,
  args: Record<string, unknown>,
  clientRequestId: string,
): Promise<void> {
  await enqueue(TICKET_ACTION, {
    operation,
    ticketId,
    args,
    clientRequestId,
  } satisfies TicketActionPayload)
}

/** Registra el reenvío de acciones del tiquet en la cola de salida. */
export function registerTicketActionHandler() {
  registerOutboxHandler(TICKET_ACTION, async (payload) => {
    const { operation, ticketId, args, clientRequestId } =
      payload as TicketActionPayload
    await TICKET_OPERATIONS[operation](ticketId, args, clientRequestId)
  })
}
