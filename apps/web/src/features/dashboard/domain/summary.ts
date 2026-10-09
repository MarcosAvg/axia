import type { TicketStatus } from '@/features/tickets'

export interface WorkSummary {
  total: number
  inProgress: number
  paused: number
  attended: number
}

/** Conteo por estado de la bandeja del usuario (función pura). */
export function summarizeWork(items: { status: TicketStatus }[]): WorkSummary {
  return {
    total: items.length,
    inProgress: items.filter((item) => item.status === 'in_progress').length,
    paused: items.filter((item) => item.status === 'paused').length,
    attended: items.filter((item) => item.status === 'attended').length,
  }
}
