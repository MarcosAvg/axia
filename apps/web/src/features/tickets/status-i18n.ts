// Textos de la franja de estado del tiquet (es-MX).

import type { TicketStage } from './domain/status'
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

export const stageLabels: Record<TicketStage, string> = {
  registered: 'Registrado',
  with_supervisor: 'Supervisor',
  assigned: 'Asignado',
  in_progress: 'En curso',
  attended: 'Atendido',
  closed: 'Cerrado',
}

export const statusRibbonMessages = {
  aria: 'Avance del tiquet',
  step: (current: number, total: number) => `Paso ${current} de ${total}`,
  current: (stage: string) => `Etapa actual: ${stage}`,
  paused: 'En pausa',
  discarded: 'Flujo cerrado',
  discardedHelp: 'Este tiquet ya no avanza por el flujo normal.',
} as const
