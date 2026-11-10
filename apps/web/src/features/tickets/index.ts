// Punto de entrada público del feature de tiquets.

export { TicketBoardPanel } from './components/ticket-board-panel'
export { TicketForm } from './components/ticket-form'
export { TicketDetailView } from './components/ticket-detail'
export { TicketFilters } from './components/ticket-filters'
export { TicketList } from './components/ticket-list'
export { TicketListPanel } from './components/ticket-list-panel'
export { TicketStatusSummary } from './components/ticket-status-summary'
export {
  OutboxTimeCorrection,
  isTimeError,
} from './components/outbox-time-correction'
export {
  useAttentionCounts,
  useMyOffers,
  useMyWork,
  useTicketSearchByFolio,
  useTicketsList,
} from './hooks/use-tickets'
export type { AttentionCounts } from './api/tickets-api'
export type { TicketListItem } from './domain/types'
export { ticketMessages, statusLabels, eventLabels } from './i18n'
export { EVENT_TYPES } from './domain/types'
export type { TicketStatus, EventType } from './domain/types'
export { ACTIVE_STATUSES } from './domain/status'
export { ticketPageInfo } from './domain/ticket-page'
export { ticketFiltersFromSearch } from './domain/list-filters'
export { useTicketFilterCatalogs } from './hooks/use-ticket-filter-catalogs'
