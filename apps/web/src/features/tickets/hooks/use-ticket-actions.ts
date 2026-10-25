import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isNetworkError } from '@/lib/offline/errors'
import { processOutbox } from '@/lib/offline/outbox'
import { enqueueTicketAction } from '../api/offline-actions'
import { sendSyncBatch } from '../api/sync-api'
import { TICKET_OPERATIONS } from '../api/ticket-operations'
import type { TicketOperation } from '../api/ticket-operations'

async function sendManualTimeAction(input: {
  operation: TicketOperation
  ticketId: string
  args: Record<string, unknown>
  clientRequestId: string
  occurredAt: string
}) {
  const [result] = await sendSyncBatch([
    {
      clientRequestId: input.clientRequestId,
      ticketId: input.ticketId,
      type: input.operation,
      args: input.args,
      occurredAt: input.occurredAt,
      manualTime: true,
    },
  ])
  if (result?.status !== 'applied' && result?.status !== 'duplicate') {
    throw new Error(result?.message ?? 'No se pudo ajustar la hora')
  }
}

function useTicketMutation<TVariables extends Record<string, unknown>>(
  operation: TicketOperation,
  ticketId: string,
  subjectTechnicianId?: string,
  occurredAt?: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    // Sin esto, cuando no hay conexión React Query pausa la mutación y nunca se ejecuta.
    networkMode: 'always',
    mutationFn: async (variables: TVariables) => {
      const clientRequestId = crypto.randomUUID()
      const args: Record<string, unknown> = subjectTechnicianId
        ? { ...variables, subjectTechnicianId }
        : variables
      if (occurredAt) {
        await sendManualTimeAction({
          operation,
          ticketId,
          args,
          clientRequestId,
          occurredAt,
        })
        return
      }
      try {
        await TICKET_OPERATIONS[operation](ticketId, args, clientRequestId)
      } catch (error) {
        if (isNetworkError(error)) {
          await enqueueTicketAction({
            operation,
            ticketId,
            args,
            clientRequestId,
            occurredAt,
          })
          void processOutbox()
          return
        }
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

/**
 * Mutaciones de transición del tiquet; si no hay conexión, se encolan.
 * Con `subjectTechnicianId` las acciones del técnico se registran a nombre de ese técnico (proxy).
 */
function useTicketBaseActions(
  ticketId: string,
  subjectTechnicianId: string | undefined,
  occurredAt: string | undefined,
) {
  return {
    take: useTicketMutation('take', ticketId, undefined, occurredAt),
    assignTechnician: useTicketMutation(
      'assign_technician',
      ticketId,
      undefined,
      occurredAt,
    ),
    assignSupervisor: useTicketMutation(
      'assign_supervisor',
      ticketId,
      undefined,
      occurredAt,
    ),
    addAuxiliary: useTicketMutation(
      'add_auxiliary',
      ticketId,
      undefined,
      occurredAt,
    ),
    start: useTicketMutation(
      'start',
      ticketId,
      subjectTechnicianId,
      occurredAt,
    ),
    pause: useTicketMutation(
      'pause',
      ticketId,
      subjectTechnicianId,
      occurredAt,
    ),
    advancePause: useTicketMutation(
      'advance_pause',
      ticketId,
      subjectTechnicianId,
      occurredAt,
    ),
    resume: useTicketMutation(
      'resume',
      ticketId,
      subjectTechnicianId,
      occurredAt,
    ),
    attend: useTicketMutation(
      'attend',
      ticketId,
      subjectTechnicianId,
      occurredAt,
    ),
  }
}

function useTicketFlowActions(
  ticketId: string,
  subjectTechnicianId: string | undefined,
  occurredAt: string | undefined,
) {
  return {
    validate: useTicketMutation('validate', ticketId, undefined, occurredAt),
    reject: useTicketMutation('reject', ticketId, undefined, occurredAt),
    cancel: useTicketMutation('cancel', ticketId, undefined, occurredAt),
    changePriority: useTicketMutation(
      'change_priority',
      ticketId,
      undefined,
      occurredAt,
    ),
    comment: useTicketMutation('comment', ticketId, undefined, occurredAt),
    recapture: useTicketMutation(
      'recapture',
      ticketId,
      subjectTechnicianId,
      occurredAt,
    ),
    openClaim: useTicketMutation('open_claim', ticketId, undefined, occurredAt),
    resolveClaim: useTicketMutation(
      'resolve_claim',
      ticketId,
      undefined,
      occurredAt,
    ),
    markDuplicate: useTicketMutation(
      'mark_duplicate',
      ticketId,
      undefined,
      occurredAt,
    ),
    reactivate: useTicketMutation(
      'reactivate',
      ticketId,
      undefined,
      occurredAt,
    ),
  }
}

/**
 * Mutaciones de transición del tiquet; si no hay conexión, se encolan.
 * Con `subjectTechnicianId` las acciones del técnico se registran a nombre de ese técnico (proxy).
 */
export function useTicketActions(
  ticketId: string,
  subjectTechnicianId?: string,
  occurredAt?: string,
) {
  return {
    ...useTicketBaseActions(ticketId, subjectTechnicianId, occurredAt),
    ...useTicketFlowActions(ticketId, subjectTechnicianId, occurredAt),
  }
}
