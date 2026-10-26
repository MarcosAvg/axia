// Acciones de transición del tiquet contra `POST /api/tickets/:id/actions`.

import type { ClaimResolution } from '../domain/types'
import { ticketAction } from './rpc'

export async function takeTicket(ticketId: string, clientRequestId: string) {
  await ticketAction(ticketId, 'take', clientRequestId)
}

export async function assignTechnician(
  ticketId: string,
  technicianId: string,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'assign_technician', clientRequestId, {
    technicianId,
  })
}

export async function startTicket(
  ticketId: string,
  clientRequestId: string,
  subjectTechnicianId?: string | null,
) {
  await ticketAction(ticketId, 'start', clientRequestId, {
    subjectTechnicianId: subjectTechnicianId || undefined,
  })
}

export async function attendTicket(
  ticketId: string,
  clientRequestId: string,
  input: {
    workDescription: string
    subjectTechnicianId?: string | null
    serviceTypeId?: string | null
  },
) {
  await ticketAction(ticketId, 'attend', clientRequestId, {
    workDescription: input.workDescription,
    serviceTypeId: input.serviceTypeId || undefined,
    subjectTechnicianId: input.subjectTechnicianId || undefined,
  })
}

export async function validateTicket(
  ticketId: string,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'validate', clientRequestId)
}

export async function rejectTicket(
  ticketId: string,
  reasonId: string,
  note: string | null,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'reject', clientRequestId, {
    reasonId,
    note: note ?? undefined,
  })
}

export async function cancelTicket(
  ticketId: string,
  reasonId: string,
  note: string | null,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'cancel', clientRequestId, {
    reasonId,
    note: note ?? undefined,
  })
}

export async function changePriority(
  ticketId: string,
  priorityId: string,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'change_priority', clientRequestId, {
    priorityId,
  })
}

export async function commentTicket(
  ticketId: string,
  text: string,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'comment', clientRequestId, { text })
}

export interface RecaptureTicketInput {
  changes: Record<string, string | null>
  reasonId: string | null
  note?: string | null
  subjectTechnicianId?: string | null
}

export async function recaptureTicket(
  ticketId: string,
  input: RecaptureTicketInput,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'recapture', clientRequestId, {
    changes: input.changes,
    reasonId: input.reasonId || undefined,
    note: input.note || undefined,
    subjectTechnicianId: input.subjectTechnicianId || undefined,
  })
}

export async function openClaim(
  ticketId: string,
  reasonId: string,
  description: string,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'open_claim', clientRequestId, {
    reasonId,
    description,
  })
}

export interface ResolveClaimInput {
  resolution: ClaimResolution
  resultId: string | null
  note: string | null
}

export async function resolveClaim(
  ticketId: string,
  input: ResolveClaimInput,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'resolve_claim', clientRequestId, {
    resolution: input.resolution,
    resultId: input.resultId || undefined,
    note: input.note || undefined,
  })
}

export async function markDuplicate(
  ticketId: string,
  originalId: string,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'mark_duplicate', clientRequestId, {
    originalId,
  })
}

export async function reactivateTicket(
  ticketId: string,
  reasonId: string,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'reactivate', clientRequestId, { reasonId })
}

export interface AssignSupervisorInput {
  reasonId: string
  supervisorUserId: string | null
  teamId: string | null
  note: string | null
}

export async function assignSupervisor(
  ticketId: string,
  input: AssignSupervisorInput,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'assign_supervisor', clientRequestId, {
    reasonId: input.reasonId,
    supervisorUserId: input.supervisorUserId || undefined,
    teamId: input.teamId || undefined,
    note: input.note || undefined,
  })
}

export interface AddAuxiliaryInput {
  technicianId: string
  reasonId: string
  note: string | null
}

export async function addAuxiliary(
  ticketId: string,
  input: AddAuxiliaryInput,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'add_auxiliary', clientRequestId, {
    technicianId: input.technicianId,
    reasonId: input.reasonId,
    note: input.note || undefined,
  })
}
