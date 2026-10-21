// Cola de acciones del tiquet: cuando no hay conexión, la acción se encola y se
// reenvía con el contrato de sincronización, conservando `occurredAt` y el UUID.

import { enqueue, registerOutboxHandler } from '@/lib/offline/outbox'
import { sendSyncBatch } from './sync-api'
import type { TicketOperation } from './ticket-operations'

const TICKET_ACTION = 'ticket_action'

export interface TicketActionPayload {
  operation: TicketOperation
  ticketId: string
  args: Record<string, unknown>
  clientRequestId: string
  occurredAt: string
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
    occurredAt: new Date().toISOString(),
  } satisfies TicketActionPayload)
}

/** Registra el reenvío de acciones del tiquet en la cola de salida. */
export function registerTicketActionHandler() {
  registerOutboxHandler(TICKET_ACTION, async (payload) => {
    const data = payload as TicketActionPayload
    const [result] = await sendSyncBatch([
      {
        clientRequestId: data.clientRequestId,
        ticketId: data.ticketId,
        type: data.operation,
        args: data.args,
        occurredAt: data.occurredAt,
      },
    ])
    if (!result) throw new Error('La sincronización no devolvió resultado')
    if (result.status === 'applied' || result.status === 'duplicate') return
    throw new Error(result.message ?? result.code ?? result.status)
  })
}
