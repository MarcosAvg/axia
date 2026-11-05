import { eventLabels } from '@/features/tickets'

interface NotificationContext {
  teamName: string | null
  buildingName: string | null
  categoryName: string | null
  priorityName: string | null
  duplicateFolio: string | null
  derivedFolio: string | null
  fromPriorityName: string | null
  toPriorityName: string | null
}

export interface NotificationItem {
  id: string
  ticketId: string | null
  ticketFolio: string | null
  type: string
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
  actorName: string | null
  reasonName: string | null
  context: NotificationContext
}

/** Etiqueta legible del evento, con el identificador como respaldo. */
export function notificationLabel(type: string): string {
  return (eventLabels as Record<string, string>)[type] ?? type
}

/** Número compacto para la campana. */
export function unreadBadge(count: number): string {
  return count > 9 ? '9+' : String(count)
}

const titles: Record<string, string> = {
  offered: 'Nueva oferta de tiquet',
  taken: 'Tomaron tu tiquet',
  assigned_technician: 'Te asignaron un tiquet',
  reassigned_supervisor: 'Te reasignaron un tiquet',
  reassigned_technician: 'Te reasignaron un tiquet',
  auxiliary_added: 'Te agregaron como apoyo',
  capture_recaptured: 'Cambiaron los datos del tiquet',
  attended: 'Atendido, pendiente de validación',
  validated: 'Validación registrada',
  claim_opened: 'Reclamación abierta',
  claim_resolved: 'Reclamación resuelta',
  reopened: 'Tiquet reabierto',
  rejected: 'Tiquet rechazado',
  cancelled: 'Tiquet cancelado',
  duplicate_marked: 'Tiquet marcado como duplicado',
  reactivated: 'Tiquet reactivado',
  priority_changed: 'Prioridad ajustada',
  unrouted: 'Tiquet sin supervisores',
  rated: 'Calificación recibida',
}

const recaptureFields: Record<string, string> = {
  buildingId: 'edificio',
  locationId: 'ubicación',
  dependencyId: 'dependencia',
  categoryId: 'categoría',
  subcategoryId: 'subcategoría',
  problemId: 'problema',
  serviceTypeId: 'tipo de servicio',
  priorityId: 'prioridad',
  description: 'descripción',
}

const claimResolutions: Record<string, string> = {
  upheld: 'La reclamación fue procedente.',
  dismissed: 'La reclamación fue desestimada.',
  new_ticket: 'Se creó un tiquet nuevo.',
}

type DetailBuilder = (item: NotificationItem) => string | null

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim()
  return clean.length > 0 ? clean : null
}

function excerpt(value: unknown, max = 120): string | null {
  const clean = text(value)
  if (!clean) return null
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean
}

function sentence(value: string | null, ending = '.'): string | null {
  if (!value) return null
  return value.endsWith(ending) ? value : `${value}${ending}`
}

function line(parts: Array<string | null | undefined>): string | null {
  const present = parts.filter((part): part is string => Boolean(part))
  return present.length > 0 ? present.join(' ') : null
}

function reason(item: NotificationItem): string | null {
  return item.reasonName ? sentence(`Motivo: ${item.reasonName}`) : null
}

function note(item: NotificationItem): string | null {
  const value = excerpt(item.payload.note)
  return value ? sentence(`Nota: ${value}`) : null
}

function actor(item: NotificationItem, action: string): string | null {
  return item.actorName ? sentence(`${item.actorName} ${action}`) : null
}

function changedFields(item: NotificationItem): string | null {
  const names = Object.keys(recaptureFields)
    .filter((key) => item.payload[key] !== undefined)
    .map((key) => recaptureFields[key])
  return names.length > 0 ? sentence(`Campos: ${names.join(', ')}`) : null
}

const offered: DetailBuilder = (item) =>
  line([
    item.context.teamName,
    item.context.buildingName,
    item.context.priorityName,
  ])

const taken: DetailBuilder = (item) => actor(item, 'tomó el tiquet')

const assigned: DetailBuilder = (item) =>
  line([
    actor(item, 'te lo asignó'),
    item.context.categoryName,
    item.context.buildingName,
  ])

const reassignedSupervisor: DetailBuilder = (item) =>
  line([actor(item, 'te lo reasignó'), reason(item), note(item)])

const auxiliaryAdded: DetailBuilder = (item) =>
  line([actor(item, 'te agregó como apoyo'), reason(item), note(item)])

const recaptured: DetailBuilder = (item) =>
  line([
    actor(item, 'corrigió la captura'),
    changedFields(item),
    reason(item),
    note(item),
  ])

const attended: DetailBuilder = (item) => {
  const work = excerpt(item.payload.workDescription)
  return line([
    actor(item, 'lo marcó como atendido'),
    work ? sentence(`Trabajo: ${work}`) : null,
  ])
}

const validated: DetailBuilder = (item) => {
  const role = item.payload.role === 'requester' ? 'solicitante' : 'supervisor'
  return line([
    actor(item, `validó como ${role}`),
    item.payload.partial === true
      ? sentence('Falta la validación de la otra parte')
      : sentence('El tiquet quedó cerrado'),
  ])
}

const claimOpened: DetailBuilder = (item) => {
  const description = excerpt(item.payload.description)
  return line([
    actor(item, 'abrió la reclamación'),
    reason(item),
    description ? sentence(`Detalle: ${description}`) : null,
  ])
}

const claimResolved: DetailBuilder = (item) => {
  const resolution = text(item.payload.resolution)
  return line([
    actor(item, 'resolvió la reclamación'),
    resolution ? (claimResolutions[resolution] ?? null) : null,
    item.context.derivedFolio
      ? sentence(`Nuevo tiquet: ${item.context.derivedFolio}`)
      : null,
  ])
}

const reopened: DetailBuilder = (item) =>
  line([actor(item, 'lo reabrió'), reason(item), note(item)])

const rejected: DetailBuilder = (item) =>
  line([actor(item, 'lo rechazó'), reason(item), note(item)])

const cancelled: DetailBuilder = (item) =>
  line([actor(item, 'lo canceló'), reason(item), note(item)])

const reactivated: DetailBuilder = (item) =>
  line([actor(item, 'lo reactivó'), reason(item), note(item)])

const duplicateMarked: DetailBuilder = (item) =>
  line([
    actor(item, 'lo marcó como duplicado'),
    item.context.duplicateFolio
      ? sentence(`Duplicado de ${item.context.duplicateFolio}`)
      : null,
  ])

const priorityChanged: DetailBuilder = (item) =>
  line([
    actor(item, 'cambió la prioridad'),
    item.context.fromPriorityName && item.context.toPriorityName
      ? sentence(
          `De ${item.context.fromPriorityName} a ${item.context.toPriorityName}`,
        )
      : null,
    reason(item),
    note(item),
  ])

const unrouted: DetailBuilder = (item) =>
  line([
    item.context.teamName
      ? sentence(`Sin supervisores candidatos en ${item.context.teamName}`)
      : sentence('Sin supervisores candidatos'),
    item.context.buildingName
      ? sentence(`Edificio: ${item.context.buildingName}`)
      : null,
  ])

const rated: DetailBuilder = (item) => {
  const score =
    typeof item.payload.score === 'number' ? item.payload.score : null
  const comment = excerpt(item.payload.comment)
  return line([
    score === null ? null : sentence(`Calificación: ${score}/5`),
    comment ? sentence(`Comentario: ${comment}`) : null,
  ])
}

const detailBuilders: Record<string, DetailBuilder> = {
  offered,
  taken,
  assigned_technician: assigned,
  reassigned_technician: assigned,
  reassigned_supervisor: reassignedSupervisor,
  auxiliary_added: auxiliaryAdded,
  capture_recaptured: recaptured,
  attended,
  validated,
  claim_opened: claimOpened,
  claim_resolved: claimResolved,
  reopened,
  rejected,
  cancelled,
  reactivated,
  duplicate_marked: duplicateMarked,
  priority_changed: priorityChanged,
  unrouted,
  rated,
}

function defaultDetail(item: NotificationItem): string | null {
  return line([reason(item), note(item), excerpt(item.payload.text)])
}

/** Título y detalle legibles de un aviso, con el destinatario como voz. */
export function notificationCopy(item: NotificationItem): {
  title: string
  detail: string | null
} {
  return {
    title: titles[item.type] ?? notificationLabel(item.type),
    detail: detailBuilders[item.type]?.(item) ?? defaultDetail(item),
  }
}
