// Cola de acciones del tiquet: cuando no hay conexión, la acción se encola y se
// reenvía con el contrato de sincronización, conservando la hora del dispositivo
// y el UUID. La hora manual de la acción viaja aparte.

import { enqueue, registerOutboxHandler } from '@/lib/offline/outbox'
import { OutboxError } from '@/lib/offline/errors'
import { z } from 'zod'
import { sendSyncBatch } from './sync-api'
import { ticketCommandSchema } from './ticket-commands'
import type { TicketCommandInput } from './ticket-commands'

const TICKET_ACTION = 'ticket_action'

const contextSchema = z.object({
  ticketId: z.string().min(1),
  clientRequestId: z.string().uuid(),
  clientReportedAt: z.string().datetime(),
  occurredLocal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .optional(),
  manualTime: z.boolean().optional(),
})

export async function enqueueTicketAction(
  input: TicketCommandInput,
): Promise<void> {
  const command = ticketCommandSchema.parse(input)
  await enqueue(
    TICKET_ACTION,
    {
      ...command,
      ...contextSchema.parse({
        ...input,
        clientReportedAt: new Date().toISOString(),
      }),
    },
    input.ticketId,
  )
}

/** Registra el reenvío de acciones del tiquet en la cola de salida. */
export function registerTicketActionHandler() {
  registerOutboxHandler(
    TICKET_ACTION,
    async (payload) => {
      const data = {
        ...ticketCommandSchema.parse(payload),
        ...contextSchema.parse(payload),
      }
      const [result] = await sendSyncBatch([
        {
          clientRequestId: data.clientRequestId,
          ticketId: data.ticketId,
          type: data.operation,
          args: data.args,
          clientReportedAt: data.clientReportedAt,
          occurredLocal: data.occurredLocal,
          manualTime: data.manualTime,
        },
      ])
      if (!result) throw new Error('La sincronización no devolvió resultado')
      if (result.status === 'applied' || result.status === 'duplicate') return
      throw new OutboxError(
        result.message ?? result.code ?? result.status,
        result.code,
      )
    },
    undefined,
    async (payload) =>
      z.object({ ticketId: z.string().min(1) }).safeParse(payload).data
        ?.ticketId,
  )
}
