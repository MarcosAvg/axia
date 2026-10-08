// RPC de transición del tiquet. Toda acción de avance pasa por aquí (RPC, nunca update directo).

import { supabase } from '@/lib/supabase'

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

export async function startTicket(ticketId: string, clientRequestId: string) {
  await run(
    supabase.rpc('ticket_start', {
      p_ticket_id: ticketId,
      p_client_request_id: clientRequestId,
    }),
  )
}

export async function pauseTicket(
  ticketId: string,
  reasonId: string,
  note: string | null,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_pause', {
      p_ticket_id: ticketId,
      p_reason_id: reasonId,
      p_note: note ?? undefined,
      p_client_request_id: clientRequestId,
    }),
  )
}

export async function resumeTicket(ticketId: string, clientRequestId: string) {
  await run(
    supabase.rpc('ticket_resume', {
      p_ticket_id: ticketId,
      p_client_request_id: clientRequestId,
    }),
  )
}

export async function attendTicket(
  ticketId: string,
  workDescription: string,
  clientRequestId: string,
) {
  await run(
    supabase.rpc('ticket_attend', {
      p_ticket_id: ticketId,
      p_work_description: workDescription,
      p_client_request_id: clientRequestId,
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
