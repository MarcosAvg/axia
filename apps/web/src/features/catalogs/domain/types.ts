export interface Option {
  id: string
  name: string
}

export interface LocationOption extends Option {
  buildingId: string
}

export interface CategoryOption extends Option {
  teamId: string
}

export interface SubcategoryOption extends Option {
  categoryId: string
}

export interface ProblemOption extends Option {
  subcategoryId: string
}

export interface RequesterOption {
  id: string
  fullName: string
  contact: string | null
  dependencyId: string | null
  userId: string | null
}

export interface TechnicianOption {
  id: string
  fullName: string
  teamId: string
}

export type ReasonUse =
  | 'pause'
  | 'rejection'
  | 'cancellation'
  | 'supervisor_reassignment'
  | 'technician_reassignment'
  | 'recapture'
  | 'claim'
  | 'claim_outcome'
  | 'reactivation'
  | 'auxiliary_support'

export interface ReasonOption {
  id: string
  name: string
  use: ReasonUse
  parentId: string | null
}
