import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  assignTechnician,
  attendTicket,
  cancelTicket,
  changePriority,
  commentTicket,
  pauseTicket,
  rejectTicket,
  resumeTicket,
  startTicket,
  takeTicket,
  validateTicket,
} from '../api/transitions-api'

function useTicketMutation<TVariables>(
  fn: (variables: TVariables, clientRequestId: string) => Promise<unknown>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: TVariables) => fn(variables, crypto.randomUUID()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

/** Mutaciones de transición del tiquet, con idempotencia e invalidación. */
export function useTicketActions(ticketId: string) {
  return {
    take: useTicketMutation<void>((_variables, id) => takeTicket(ticketId, id)),
    assignTechnician: useTicketMutation<{ technicianId: string }>(
      (variables, id) => assignTechnician(ticketId, variables.technicianId, id),
    ),
    start: useTicketMutation<void>((_variables, id) =>
      startTicket(ticketId, id),
    ),
    pause: useTicketMutation<{ reasonId: string; note: string | null }>(
      (variables, id) =>
        pauseTicket(ticketId, variables.reasonId, variables.note, id),
    ),
    resume: useTicketMutation<void>((_variables, id) =>
      resumeTicket(ticketId, id),
    ),
    attend: useTicketMutation<{ workDescription: string }>((variables, id) =>
      attendTicket(ticketId, variables.workDescription, id),
    ),
    validate: useTicketMutation<void>((_variables, id) =>
      validateTicket(ticketId, id),
    ),
    reject: useTicketMutation<{ reasonId: string; note: string | null }>(
      (variables, id) =>
        rejectTicket(ticketId, variables.reasonId, variables.note, id),
    ),
    cancel: useTicketMutation<{ reasonId: string; note: string | null }>(
      (variables, id) =>
        cancelTicket(ticketId, variables.reasonId, variables.note, id),
    ),
    changePriority: useTicketMutation<{ priorityId: string }>((variables, id) =>
      changePriority(ticketId, variables.priorityId, id),
    ),
    comment: useTicketMutation<{ text: string }>((variables, id) =>
      commentTicket(ticketId, variables.text, id),
    ),
  }
}
