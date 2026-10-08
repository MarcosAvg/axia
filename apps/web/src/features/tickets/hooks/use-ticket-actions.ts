import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isNetworkError } from '@/lib/offline/errors'
import { enqueueTicketAction } from '../api/offline-actions'
import { TICKET_OPERATIONS } from '../api/ticket-operations'
import type { TicketOperation } from '../api/ticket-operations'

function useTicketMutation<TVariables extends Record<string, unknown>>(
  operation: TicketOperation,
  ticketId: string,
  subjectTechnicianId?: string,
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
      try {
        await TICKET_OPERATIONS[operation](ticketId, args, clientRequestId)
      } catch (error) {
        if (isNetworkError(error)) {
          await enqueueTicketAction(operation, ticketId, args, clientRequestId)
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
export function useTicketActions(
  ticketId: string,
  subjectTechnicianId?: string,
) {
  return {
    take: useTicketMutation('take', ticketId),
    assignTechnician: useTicketMutation('assign_technician', ticketId),
    assignSupervisor: useTicketMutation('assign_supervisor', ticketId),
    addAuxiliary: useTicketMutation('add_auxiliary', ticketId),
    start: useTicketMutation('start', ticketId, subjectTechnicianId),
    pause: useTicketMutation('pause', ticketId, subjectTechnicianId),
    resume: useTicketMutation('resume', ticketId, subjectTechnicianId),
    attend: useTicketMutation('attend', ticketId, subjectTechnicianId),
    validate: useTicketMutation('validate', ticketId),
    reject: useTicketMutation('reject', ticketId),
    cancel: useTicketMutation('cancel', ticketId),
    changePriority: useTicketMutation('change_priority', ticketId),
    comment: useTicketMutation('comment', ticketId),
    recapture: useTicketMutation('recapture', ticketId, subjectTechnicianId),
    openClaim: useTicketMutation('open_claim', ticketId),
    resolveClaim: useTicketMutation('resolve_claim', ticketId),
    markDuplicate: useTicketMutation('mark_duplicate', ticketId),
    reactivate: useTicketMutation('reactivate', ticketId),
  }
}
