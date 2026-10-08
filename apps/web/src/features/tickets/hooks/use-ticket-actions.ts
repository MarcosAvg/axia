import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  addAuxiliary,
  assignSupervisor,
  assignTechnician,
  attendTicket,
  cancelTicket,
  changePriority,
  commentTicket,
  markDuplicate,
  openClaim,
  pauseTicket,
  reactivateTicket,
  recaptureTicket,
  rejectTicket,
  resolveClaim,
  resumeTicket,
  startTicket,
  takeTicket,
  validateTicket,
} from '../api/transitions-api'
import type { ClaimResolution } from '../domain/types'

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

/** Mutaciones de recaptura, reclamaciones, duplicado, reactivación y asignación. */
function useTicketExtraActions(ticketId: string) {
  return {
    assignSupervisor: useTicketMutation<{
      reasonId: string
      supervisorUserId: string | null
      teamId: string | null
      note: string | null
    }>((variables, id) => assignSupervisor(ticketId, variables, id)),
    addAuxiliary: useTicketMutation<{
      technicianId: string
      reasonId: string
      note: string | null
    }>((variables, id) => addAuxiliary(ticketId, variables, id)),
    recapture: useTicketMutation<{
      changes: Record<string, string | null>
      reasonId: string | null
    }>((variables, id) =>
      recaptureTicket(ticketId, variables.changes, variables.reasonId, id),
    ),
    openClaim: useTicketMutation<{ reasonId: string; description: string }>(
      (variables, id) =>
        openClaim(ticketId, variables.reasonId, variables.description, id),
    ),
    resolveClaim: useTicketMutation<{
      resolution: ClaimResolution
      resultId: string | null
      note: string | null
    }>((variables, id) => resolveClaim(ticketId, variables, id)),
    markDuplicate: useTicketMutation<{ originalId: string }>((variables, id) =>
      markDuplicate(ticketId, variables.originalId, id),
    ),
    reactivate: useTicketMutation<{ reasonId: string }>((variables, id) =>
      reactivateTicket(ticketId, variables.reasonId, id),
    ),
  }
}

/** Mutaciones de transición del tiquet, con idempotencia e invalidación. */
export function useTicketActions(ticketId: string) {
  const extra = useTicketExtraActions(ticketId)
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
    ...extra,
  }
}
