import { z } from 'zod'
import { apiFetch } from '@/lib/api-client'
import { sendSyncBatch } from './sync-api'

const id = z.string().min(1)
// Las filas guardadas por versiones anteriores pueden incluir opcionales nulos.
const optionalText = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined)
  .optional()
const proxy = { subjectTechnicianId: optionalText }
const requesterProxy = { subjectRequesterId: optionalText }
const reason = { reasonId: id, note: optionalText }
const pause = z.object({ ...reason, ...proxy, estimatedDate: optionalText })
const changes = z
  .object({
    buildingId: id.optional(),
    locationId: id.optional(),
    dependencyId: id.optional(),
    categoryId: id.optional(),
    subcategoryId: id.nullable().optional(),
    problemId: id.nullable().optional(),
    serviceTypeId: id.nullable().optional(),
    priorityId: id.optional(),
    description: z.string().min(5).optional(),
  })
  .refine((value) => Object.keys(value).length > 0)

export const ticketCommandSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('take'), args: z.object({}) }),
  z.object({
    operation: z.literal('assign_technician'),
    args: z.object({ technicianId: id, reasonId: optionalText }),
  }),
  z.object({
    operation: z.literal('assign_supervisor'),
    args: z.object({
      ...reason,
      supervisorUserId: optionalText,
      teamId: optionalText,
    }),
  }),
  z.object({
    operation: z.literal('add_auxiliary'),
    args: z.object({ ...reason, technicianId: id }),
  }),
  z.object({ operation: z.literal('start'), args: z.object(proxy) }),
  z.object({ operation: z.literal('pause'), args: pause }),
  z.object({
    operation: z.literal('advance_pause'),
    args: z.object({ ...reason, ...proxy }),
  }),
  z.object({
    operation: z.literal('resume'),
    args: z.object({ reasonId: id, ...proxy }),
  }),
  z.object({
    operation: z.literal('attend'),
    args: z.object({
      workDescription: z.string().min(5),
      serviceTypeId: optionalText,
      ...proxy,
    }),
  }),
  z.object({
    operation: z.literal('validate'),
    args: z.object(requesterProxy),
  }),
  z.object({ operation: z.literal('reject'), args: z.object(reason) }),
  z.object({
    operation: z.literal('cancel'),
    args: z.object({ ...reason, ...requesterProxy }),
  }),
  z.object({
    operation: z.literal('change_priority'),
    args: z.object({ priorityId: id }),
  }),
  z.object({
    operation: z.literal('comment'),
    args: z.object({ text: z.string().min(1) }),
  }),
  z.object({
    operation: z.literal('recapture'),
    args: z.object({
      changes,
      reasonId: optionalText,
      note: optionalText,
      ...proxy,
    }),
  }),
  z.object({
    operation: z.literal('open_claim'),
    args: z.object({
      reasonId: id,
      description: z.string().min(5),
      ...requesterProxy,
    }),
  }),
  z.object({
    operation: z.literal('resolve_claim'),
    args: z.object({
      resolution: z.enum(['upheld', 'dismissed', 'new_ticket']),
      resultId: optionalText,
      note: optionalText,
    }),
  }),
  z.object({
    operation: z.literal('mark_duplicate'),
    args: z.object({ originalId: id }),
  }),
  z.object({
    operation: z.literal('reactivate'),
    args: z.object({ reasonId: id }),
  }),
  z.object({
    operation: z.literal('rate'),
    args: z.object({
      score: z.number().int().min(1).max(5),
      comment: optionalText,
      ...requesterProxy,
    }),
  }),
])

export type TicketCommand = z.infer<typeof ticketCommandSchema>
export type TicketOperation = TicketCommand['operation']
export type ArgsFor<Operation extends TicketOperation> = Extract<
  TicketCommand,
  { operation: Operation }
>['args']
export type TicketCommandInput = TicketCommand & {
  ticketId: string
  clientRequestId: string
  occurredAt?: string
  manualTime?: boolean
}

/** Conserva el mismo comando y UUID en el envío inmediato y con hora manual. */
export async function sendTicketCommand(
  input: TicketCommandInput,
): Promise<void> {
  const command = ticketCommandSchema.parse(input)
  if (input.manualTime && input.occurredAt) {
    const [result] = await sendSyncBatch([
      {
        ticketId: input.ticketId,
        clientRequestId: input.clientRequestId,
        type: command.operation,
        args: command.args,
        occurredAt: input.occurredAt,
        manualTime: true,
      },
    ])
    if (result?.status !== 'applied' && result?.status !== 'duplicate') {
      throw new Error(result?.message ?? 'No se pudo ajustar la hora')
    }
    return
  }
  await apiFetch(`/api/tickets/${input.ticketId}/actions`, {
    method: 'POST',
    body: JSON.stringify({
      action: command.operation,
      clientRequestId: input.clientRequestId,
      ...command.args,
    }),
  })
}
