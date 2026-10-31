import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isNetworkError } from '@/lib/offline/errors'
import { processOutbox } from '@/lib/offline/outbox'
import { enqueueTicketAction } from '../api/offline-actions'
import { sendTicketCommand, ticketCommandSchema } from '../api/ticket-commands'
import type { ArgsFor, TicketOperation } from '../api/ticket-commands'

function useTicketMutation<Operation extends TicketOperation>(
  operation: Operation,
  ticketId: string,
  subjectTechnicianId?: string,
  occurredAt?: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    // Sin esto, cuando no hay conexión React Query pausa la mutación y nunca se ejecuta.
    networkMode: 'always',
    mutationFn: async (variables: ArgsFor<Operation>) => {
      const clientRequestId = crypto.randomUUID()
      const command = ticketCommandSchema.parse({
        operation,
        args: subjectTechnicianId
          ? { ...variables, subjectTechnicianId }
          : variables,
      })
      const input = {
        ...command,
        ticketId,
        clientRequestId,
        occurredAt,
        manualTime: Boolean(occurredAt),
      }
      try {
        await sendTicketCommand(input)
      } catch (error) {
        if (isNetworkError(error)) {
          await enqueueTicketAction(input)
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
