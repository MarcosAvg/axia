import type { TicketListItem } from './types'

export interface TicketPageLike {
  items: TicketListItem[]
  total: number
  pageSize: number
}

export interface TicketPageInfo {
  items: TicketListItem[]
  total: number
  pageSize: number
  totalPages: number
}

/** Normaliza una página de tiquets, incluida la página vacía mientras carga. */
export function ticketPageInfo(page?: TicketPageLike): TicketPageInfo {
  const items = page?.items ?? []
  const total = page?.total ?? 0
  const pageSize = page?.pageSize ?? 20
  return {
    items,
    total,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
