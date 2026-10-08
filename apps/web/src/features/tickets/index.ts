// Punto de entrada público del feature de tiquets.

export { TicketForm } from './components/ticket-form'
export { TicketDetailView } from './components/ticket-detail'
export { TicketFilters } from './components/ticket-filters'
export { TicketList } from './components/ticket-list'
export { TicketListPanel } from './components/ticket-list-panel'
export { useMyOffers, useMyWork, useTicketsList } from './hooks/use-tickets'
export { registerEvidenceUploadHandler } from './api/offline-evidence'
export { ticketMessages } from './i18n'
export { ACTIVE_STATUSES } from './domain/status'
export { ticketListSearchSchema } from './schemas'
export type { TicketListSearch } from './schemas'
