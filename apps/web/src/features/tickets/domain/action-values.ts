import type { ClaimResolution } from './types'

/** Valores compartidos por el formulario de acciones y sus validaciones. */
export interface ActionValues {
  technicianId: string
  reasonId: string
  priorityId: string
  serviceTypeId: string
  note: string
  text: string
  resolution: ClaimResolution
}

export const EMPTY_ACTION_VALUES: ActionValues = {
  technicianId: '',
  reasonId: '',
  priorityId: '',
  serviceTypeId: '',
  note: '',
  text: '',
  resolution: 'upheld',
}
