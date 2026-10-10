// RPC de pausa y subestados del tiquet.

import { supabase } from '@/lib/supabase'
import { run } from './rpc'

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

/** Gestiona la pausa: cambia el subestado dentro del motivo. */
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

/** Reanuda la pausa con el subestado (hijo directo del motivo) que la esclarece. */
export async function resumeTicket(
  ticketId: string,
  reasonId: string,
  clientRequestId: string,
  subjectTechnicianId?: string | null,
) {
  await run(
    supabase.rpc('ticket_resume', {
      p_ticket_id: ticketId,
      p_reason_id: reasonId,
      p_client_request_id: clientRequestId,
      p_subject_technician_id: subjectTechnicianId ?? undefined,
    }),
  )
}
