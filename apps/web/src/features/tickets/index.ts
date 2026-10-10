// Punto de entrada público del feature de tiquets.

export { TicketForm } from './components/ticket-form'
export { TicketDetailView } from './components/ticket-detail'
export { TicketFilters } from './components/ticket-filters'
export { TicketList } from './components/ticket-list'
export { TicketListPanel } from './components/ticket-list-panel'
export { TicketStatusSummary } from './components/ticket-status-summary'
export {
  useMyOffers,
  useMyWork,
  useTicketSearchByFolio,
  useTicketsList,
} from './hooks/use-tickets'
export type { TicketListItem } from './domain/types'
export { registerEvidenceUploadHandler } from './api/offline-evidence'
export { registerTicketActionHandler } from './api/offline-actions'
export { ticketMessages, statusLabels, eventLabels } from './i18n'
export { TICKET_STATUSES, EVENT_TYPES } from './domain/types'
export type { TicketStatus, EventType } from './domain/types'
export { ACTIVE_STATUSES } from './domain/status'
export { ticketListSearchSchema } from './schemas'
export type { TicketListSearch } from './schemas'
