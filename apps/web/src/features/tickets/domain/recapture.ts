import type { TicketDetail } from './types'

export interface RecaptureValues {
  buildingId: string
  locationId: string
  dependencyId: string
  categoryId: string
  subcategoryId: string
  problemId: string
  serviceTypeId: string
  priorityId: string
  description: string
  reasonId: string
  note: string
}

export function initialRecaptureValues(ticket: TicketDetail): RecaptureValues {
  return {
    buildingId: ticket.buildingId,
    locationId: ticket.locationId,
    dependencyId: ticket.dependencyId,
    categoryId: ticket.categoryId,
    subcategoryId: ticket.subcategoryId ?? '',
    problemId: ticket.problemId ?? '',
    serviceTypeId: ticket.serviceTypeId ?? '',
    priorityId: ticket.priorityId,
    description: ticket.description,
    reasonId: '',
    note: '',
  }
}

/** Aplica un cambio y limpia los dependientes (ubicación, subcategoría y problema). */
export function applyRecaptureChange(
  current: RecaptureValues,
  name: keyof RecaptureValues,
  value: string,
): RecaptureValues {
  const next = { ...current, [name]: value }
  if (name === 'buildingId') next.locationId = ''
  if (name === 'categoryId') {
    next.subcategoryId = ''
    next.problemId = ''
  }
  if (name === 'subcategoryId') next.problemId = ''
  return next
}

/** Campos que envía la recaptura (vacío → null). */
export function recaptureChanges(
  values: RecaptureValues,
): Record<string, string | null> {
  return {
    building_id: values.buildingId,
    location_id: values.locationId,
    dependency_id: values.dependencyId,
    category_id: values.categoryId,
    subcategory_id: values.subcategoryId || null,
    problem_id: values.problemId || null,
    service_type_id: values.serviceTypeId || null,
    priority_id: values.priorityId,
    description: values.description,
  }
}
