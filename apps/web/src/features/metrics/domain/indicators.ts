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
