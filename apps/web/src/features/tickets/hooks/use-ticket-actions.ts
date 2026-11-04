import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isNetworkError } from '@/lib/offline/errors'
import { processOutbox } from '@/lib/offline/outbox'
import { enqueueTicketAction } from '../api/offline-actions'
import { sendTicketCommand, ticketCommandSchema } from '../api/ticket-commands'
import type { ArgsFor, TicketOperation } from '../api/ticket-commands'
import type { ProxySubject } from '../domain/actions'

const TECHNICIAN_OPERATIONS = new Set<TicketOperation>([
  'start',
  'pause',
  'advance_pause',
  'resume',
  'attend',
  'recapture',
])

const REQUESTER_OPERATIONS = new Set<TicketOperation>([
  'validate',
  'rate',
  'open_claim',
  'cancel',
])

type SubjectFields = {
  subjectTechnicianId?: string
  subjectRequesterId?: string
}

/** Solo adjunta el sujeto que corresponde a la operación. */
export function subjectFieldsFor(
  operation: TicketOperation,
  subject: ProxySubject,
): SubjectFields {
  if (subject?.kind === 'technician' && TECHNICIAN_OPERATIONS.has(operation)) {
    return { subjectTechnicianId: subject.technicianId }
  }
  if (subject?.kind === 'requester' && REQUESTER_OPERATIONS.has(operation)) {
    return { subjectRequesterId: subject.requesterId }
  }
  return {}
}

function useTicketMutation<Operation extends TicketOperation>(
  operation: Operation,
  ticketId: string,
  subject: ProxySubject = null,
  occurredAt?: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    // Sin esto, cuando no hay conexión React Query pausa la mutación y nunca se ejecuta.
    networkMode: 'always',
    mutationFn: async (variables: ArgsFor<Operation>) => {
      const clientRequestId = crypto.randomUUID()
      const fields = subjectFieldsFor(operation, subject)
      const command = ticketCommandSchema.parse({
        operation,
        args: { ...variables, ...fields },
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

function useTicketBaseActions(
  ticketId: string,
  subject: ProxySubject,
  occurredAt: string | undefined,
) {
  return {
    take: useTicketMutation('take', ticketId, null, occurredAt),
    assignTechnician: useTicketMutation(
      'assign_technician',
      ticketId,
      null,
      occurredAt,
    ),
    assignSupervisor: useTicketMutation(
      'assign_supervisor',
      ticketId,
      null,
      occurredAt,
    ),
    addAuxiliary: useTicketMutation(
      'add_auxiliary',
      ticketId,
      null,
      occurredAt,
    ),
    start: useTicketMutation('start', ticketId, subject, occurredAt),
    pause: useTicketMutation('pause', ticketId, subject, occurredAt),
    advancePause: useTicketMutation(
      'advance_pause',
      ticketId,
      subject,
      occurredAt,
    ),
    resume: useTicketMutation('resume', ticketId, subject, occurredAt),
    attend: useTicketMutation('attend', ticketId, subject, occurredAt),
  }
}

function useTicketFlowActions(
  ticketId: string,
  subject: ProxySubject,
  occurredAt: string | undefined,
) {
  return {
    validate: useTicketMutation('validate', ticketId, subject, occurredAt),
    reject: useTicketMutation('reject', ticketId, null, occurredAt),
    cancel: useTicketMutation('cancel', ticketId, subject, occurredAt),
    changePriority: useTicketMutation(
      'change_priority',
      ticketId,
      null,
      occurredAt,
    ),
    comment: useTicketMutation('comment', ticketId, null, occurredAt),
    recapture: useTicketMutation('recapture', ticketId, subject, occurredAt),
    openClaim: useTicketMutation('open_claim', ticketId, subject, occurredAt),
    resolveClaim: useTicketMutation(
      'resolve_claim',
      ticketId,
      null,
      occurredAt,
    ),
    markDuplicate: useTicketMutation(
      'mark_duplicate',
      ticketId,
      null,
      occurredAt,
    ),
    reactivate: useTicketMutation('reactivate', ticketId, null, occurredAt),
  }
}

/**
 * Mutaciones de transición del tiquet; si no hay conexión, se encolan.
 * El sujeto proxy solo se adjunta a las operaciones que lo admiten.
 */
export function useTicketActions(
  ticketId: string,
  subject: ProxySubject = null,
  occurredAt?: string,
) {
  return {
    ...useTicketBaseActions(ticketId, subject, occurredAt),
    ...useTicketFlowActions(ticketId, subject, occurredAt),
  }
}
