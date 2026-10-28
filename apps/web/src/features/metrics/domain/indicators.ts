// Tipos de indicadores agregados nuevos (técnicos, rechazos y ruteo).

/** Opción con identificador y nombre para catálogos de filtro. */
export interface NamedOption {
  id: string
  name: string
}

/** Catálogos usados por los filtros del tablero. */
export interface FilterCatalogs {
  buildings: NamedOption[]
  teams: NamedOption[]
  categories: NamedOption[]
  dependencies: NamedOption[]
  requesters: NamedOption[]
}

export interface TechnicianRow {
  technicianId: string
  name: string
  tickets: number
  leaderCount: number
  auxiliaryCount: number
  participationMinutes: number
  participationLaborMinutes: number
  participationExtraMinutes: number
  assignedCount: number
}

export interface RejectCancelRow {
  eventType: string
  reasonName: string
  tickets: number
}

export interface RoutingSummary {
  offers: number
  pendingOffers: number
  taken: number
  avgTimeToTakeMinutes: number
}

export interface TechnicianTimeRow {
  technicianId: string
  name: string
  tickets: number
  avgActive: number
  avgTotal: number
  avgResponse: number
  avgAssignment: number
  avgValidation: number
}

export interface SupervisorRow {
  supervisorId: string
  name: string
  offers: number
  taken: number
  pending: number
  withdrawn: number
  avgTimeToTakeMinutes: number
  reassigned: number
  validated: number
}

export interface PauseSubstateRow {
  name: string
  pauses: number
  pauseMinutes: number
}
