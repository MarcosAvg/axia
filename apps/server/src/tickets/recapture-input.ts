/** Campos que la recaptura puede comparar contra el tiquet actual. */
type RecaptureCurrent = {
  buildingId: string
  locationId: string
  dependencyId: string
  categoryId: string
  subcategoryId: string | null
  problemId: string | null
  serviceTypeId: string | null
  priorityId: string
}

export type RecaptureValidationInput = {
  current: RecaptureCurrent
  changes: Partial<RecaptureCurrent>
}

/** La web envía todos los campos; solo se valida lo que de verdad cambió. */
export function changed<T>(next: T | undefined, current: T): boolean {
  return next !== undefined && next !== current
}

export function resolved<T>(next: T | undefined, current: T): T {
  return next !== undefined ? next : current
}
