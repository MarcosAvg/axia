import type { TicketStatus, TimeSpanKind } from './types'

const SUGGESTED: Record<TicketStatus, TimeSpanKind> = {
  registered: 'supervisor_response',
  with_supervisor: 'technician_assignment',
  assigned: 'wait_start',
  in_progress: 'active_work',
  paused: 'pause',
  attended: 'validation',
  under_claim: 'claim',
  closed: 'validation',
  rejected: 'active_work',
  cancelled: 'active_work',
  duplicate: 'active_work',
}

/** Tipo de tramo que corresponde al estado actual cuando no hay uno abierto. */
export function suggestedTimeSpanKind(status: TicketStatus): TimeSpanKind {
  return SUGGESTED[status]
}
