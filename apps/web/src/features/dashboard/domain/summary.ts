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

export interface StatusCount {
  status: string
  count: number
}

/** Cuenta los tiquets por estado, de mayor a menor (función pura). */
export function countByStatus(items: { status: string }[]): StatusCount[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
}
