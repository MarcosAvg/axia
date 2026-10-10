// RPC de transición del tiquet. Toda acción de avance pasa por aquí (RPC, nunca update directo).

import { supabase } from '@/lib/supabase'
import type { ClaimResolution } from '../domain/types'

async function run(
  promise: { error: unknown } | PromiseLike<{ error: unknown }>,
): Promise<void> {
  const { error } = await promise
  if (error) throw error
}

export async function takeTicket(ticketId: string, clientRequestId: string) {
  await run(
    supabase.rpc('ticket_take', {
      p_ticket_id: ticketId,
      p_client_request_id: clientRequestId,
    }),
  )
}

export async function assignTechnician(
  ticketId: string,
  technicianId: string,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_assign_technician', {
      p_ticket_id: ticketId,
      p_technician_id: technicianId,
      p_client_request_id: clientRequestId,
    }),
  )
}

export async function startTicket(
  ticketId: string,
  clientRequestId: string,
  subjectTechnicianId?: string | null,
) {
  await run(
    supabase.rpc('ticket_start', {
      p_ticket_id: ticketId,
      p_client_request_id: clientRequestId,
      p_subject_technician_id: subjectTechnicianId ?? undefined,
    }),
  )
}

export interface PauseTicketInput {
  reasonId: string
  note: string | null
  subjectTechnicianId?: string | null
}

export async function pauseTicket(
  ticketId: string,
  input: PauseTicketInput,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_pause', {
      p_ticket_id: ticketId,
      p_reason_id: input.reasonId,
      p_note: input.note ?? undefined,
      p_client_request_id: clientRequestId,
      p_subject_technician_id: input.subjectTechnicianId ?? undefined,
    }),
  )
}

export async function advancePause(
  ticketId: string,
  input: PauseTicketInput,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_advance_pause', {
      p_ticket_id: ticketId,
      p_reason_id: input.reasonId,
      p_note: input.note ?? undefined,
      p_client_request_id: clientRequestId,
      p_subject_technician_id: input.subjectTechnicianId ?? undefined,
    }),
  )
}

export async function resumeTicket(
  ticketId: string,
  clientRequestId: string,
  subjectTechnicianId?: string | null,
) {
  await run(
    supabase.rpc('ticket_resume', {
      p_ticket_id: ticketId,
      p_client_request_id: clientRequestId,
      p_subject_technician_id: subjectTechnicianId ?? undefined,
    }),
  )
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
  await run(
    supabase.rpc('ticket_attend', {
      p_ticket_id: ticketId,
      p_work_description: input.workDescription,
      p_client_request_id: clientRequestId,
      p_subject_technician_id: input.subjectTechnicianId ?? undefined,
      p_service_type_id: input.serviceTypeId ?? undefined,
    }),
  )
}

export async function validateTicket(
  ticketId: string,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_validate', {
      p_ticket_id: ticketId,
      p_client_request_id: clientRequestId,
    }),
  )
}

export async function rejectTicket(
  ticketId: string,
  reasonId: string,
  note: string | null,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_reject', {
      p_ticket_id: ticketId,
      p_reason_id: reasonId,
      p_note: note ?? undefined,
      p_client_request_id: clientRequestId,
    }),
  )
}

export async function cancelTicket(
  ticketId: string,
  reasonId: string,
  note: string | null,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_cancel', {
      p_ticket_id: ticketId,
      p_reason_id: reasonId,
      p_note: note ?? undefined,
      p_client_request_id: clientRequestId,
    }),
  )
}

export async function changePriority(
  ticketId: string,
  priorityId: string,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_change_priority', {
      p_ticket_id: ticketId,
      p_priority_id: priorityId,
      p_client_request_id: clientRequestId,
    }),
  )
}

export async function commentTicket(
  ticketId: string,
  text: string,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_comment', {
      p_ticket_id: ticketId,
      p_text: text,
      p_is_internal: true,
      p_client_request_id: clientRequestId,
    }),
  )
}

export interface RecaptureTicketInput {
  changes: Record<string, string | null>
  reasonId: string | null
  subjectTechnicianId?: string | null
}

export async function recaptureTicket(
  ticketId: string,
  input: RecaptureTicketInput,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_recapture', {
      p_ticket_id: ticketId,
      p_changes: input.changes,
      p_reason_id: input.reasonId ?? undefined,
      p_client_request_id: clientRequestId,
      p_subject_technician_id: input.subjectTechnicianId ?? undefined,
    }),
  )
}

export async function openClaim(
  ticketId: string,
  reasonId: string,
  description: string,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_open_claim', {
      p_ticket_id: ticketId,
      p_reason_id: reasonId,
      p_description: description,
      p_client_request_id: clientRequestId,
    }),
  )
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
  await run(
    supabase.rpc('ticket_resolve_claim', {
      p_ticket_id: ticketId,
      p_resolution: input.resolution,
      p_result_id: input.resultId ?? undefined,
      p_note: input.note ?? undefined,
      p_client_request_id: clientRequestId,
    }),
  )
}

export async function markDuplicate(
  ticketId: string,
  originalId: string,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_mark_duplicate', {
      p_ticket_id: ticketId,
      p_original_id: originalId,
      p_client_request_id: clientRequestId,
    }),
  )
}

export async function reactivateTicket(
  ticketId: string,
  reasonId: string,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_reactivate', {
      p_ticket_id: ticketId,
      p_reason_id: reasonId,
      p_client_request_id: clientRequestId,
    }),
  )
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
  await run(
    supabase.rpc('ticket_assign_supervisor', {
      p_ticket_id: ticketId,
      p_reason_id: input.reasonId,
      p_supervisor_user_id: input.supervisorUserId ?? undefined,
      p_team_id: input.teamId ?? undefined,
      p_note: input.note ?? undefined,
      p_client_request_id: clientRequestId,
    }),
  )
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
  await run(
    supabase.rpc('ticket_add_auxiliary', {
      p_ticket_id: ticketId,
      p_technician_id: input.technicianId,
      p_reason_id: input.reasonId,
      p_note: input.note ?? undefined,
      p_client_request_id: clientRequestId,
    }),
  )
}
