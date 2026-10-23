// Etiquetas del estado del tiquet (es-MX).

import type { TicketStatus } from './domain/types'

export const statusLabels: Record<TicketStatus, string> = {
  registered: 'Registrado',
  with_supervisor: 'Tomado por supervisor',
  assigned: 'Asignado',
  in_progress: 'En proceso',
  paused: 'Pausado',
  attended: 'Atendido',
  under_claim: 'En reclamación',
  closed: 'Cerrado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  duplicate: 'Duplicado',
}
