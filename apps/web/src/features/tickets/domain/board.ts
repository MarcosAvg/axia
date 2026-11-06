import { ACTIVE_STATUSES } from './status'
import type { TicketStatus } from './types'
import type { TicketListItem } from './types'

/** Estados visibles como columnas del tablero, en orden de flujo. */
export const BOARD_STATUSES: readonly TicketStatus[] = ACTIVE_STATUSES

export interface BoardColumn {
  status: TicketStatus
  items: TicketListItem[]
}

/** Agrupa los tiquets por estado y ordena cada columna del más reciente al más antiguo. */
export function groupTicketsByStatus(
  items: readonly TicketListItem[],
  statuses: readonly TicketStatus[] = BOARD_STATUSES,
): BoardColumn[] {
  return statuses.map((status) => ({
    status,
    items: items
      .filter((item) => item.status === status)
      .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)),
  }))
}
