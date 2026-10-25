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

/** Campos que envía la recaptura. Los opcionales vacíos viajan como `null`. */
export function recaptureChanges(
  values: RecaptureValues,
): Record<string, string | null> {
  return {
    buildingId: values.buildingId,
    locationId: values.locationId,
    dependencyId: values.dependencyId,
    categoryId: values.categoryId,
    subcategoryId: values.subcategoryId || null,
    problemId: values.problemId || null,
    serviceTypeId: values.serviceTypeId || null,
    priorityId: values.priorityId,
    description: values.description,
  }
}

/** Campos obligatorios de la captura que la recaptura no puede dejar vacíos. */
export function missingRecaptureFields(
  values: RecaptureValues,
): (keyof RecaptureValues)[] {
  const required: (keyof RecaptureValues)[] = [
    'buildingId',
    'locationId',
    'dependencyId',
    'categoryId',
    'priorityId',
    'reasonId',
  ]
  const missing = required.filter((field) => !values[field])
  if (values.description.trim().length < 5) missing.push('description')
  return missing
}
