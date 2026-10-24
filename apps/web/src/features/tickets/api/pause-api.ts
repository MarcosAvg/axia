// Acciones de pausa y subestados del tiquet.

import { ticketAction } from './rpc'

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
  await ticketAction(ticketId, 'pause', clientRequestId, {
    reasonId: input.reasonId,
    note: input.note ?? undefined,
    subjectTechnicianId: input.subjectTechnicianId || undefined,
  })
}

export async function advancePause(
  ticketId: string,
  input: PauseTicketInput,
  clientRequestId: string,
) {
  await ticketAction(ticketId, 'advance_pause', clientRequestId, {
    reasonId: input.reasonId,
    note: input.note ?? undefined,
    subjectTechnicianId: input.subjectTechnicianId || undefined,
  })
}

export async function resumeTicket(
  ticketId: string,
  reasonId: string,
  clientRequestId: string,
  subjectTechnicianId?: string | null,
) {
  await ticketAction(ticketId, 'resume', clientRequestId, {
    reasonId,
    subjectTechnicianId: subjectTechnicianId || undefined,
  })
}
