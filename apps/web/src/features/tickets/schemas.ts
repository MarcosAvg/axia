import { z } from 'zod'
import {
  CLOCK_CLASSES,
  EVENT_TYPES,
  TICKET_STATUSES,
  TIME_SPAN_KINDS,
} from './domain/types'
import type {
  DuplicateCandidate,
  ManualTimeSpan,
  TicketDetail,
  TicketListItem,
  TicketRating,
  TicketTimelineItem,
} from './domain/types'

export const ticketStatusSchema = z.enum(TICKET_STATUSES)
const eventTypeSchema = z.enum(EVENT_TYPES)

const namedRef = z.object({ name: z.string() }).nullable()
const priorityRef = z
  .object({ name: z.string(), position: z.number() })
  .nullable()

const ticketBaseRowSchema = z.object({
  id: z.string(),
  folio: z.string(),
  status: ticketStatusSchema,
  reported_at: z.string(),
  closed_at: z.string().nullable(),
  description: z.string(),
  requester_name: z.string(),
  possible_duplicate: z.boolean(),
  building: namedRef,
  category: namedRef,
  priority: priorityRef,
  team: namedRef,
})

export function parseTicketListItem(raw: unknown): TicketListItem {
  const row = ticketBaseRowSchema.parse(raw)
  return {
    id: row.id,
    folio: row.folio,
    status: row.status,
    reportedAt: row.reported_at,
    closedAt: row.closed_at,
    description: row.description,
    requesterName: row.requester_name,
    possibleDuplicate: row.possible_duplicate,
    buildingName: nameOf(row.building),
    categoryName: nameOf(row.category),
    priorityName: nameOf(row.priority),
    priorityPosition: row.priority ? row.priority.position : null,
    teamName: nameOf(row.team),
  }
}

const ticketDetailRowSchema = ticketBaseRowSchema.extend({
  cycle: z.number(),
  building_id: z.string(),
  location_id: z.string(),
  dependency_id: z.string(),
  category_id: z.string(),
  subcategory_id: z.string().nullable(),
  problem_id: z.string().nullable(),
  service_type_id: z.string().nullable(),
  priority_id: z.string(),
  requester_contact: z.string().nullable(),
  duplicate_of_id: z.string().nullable(),
  location: namedRef,
  dependency: namedRef,
  subcategory: namedRef,
  problem: namedRef,
  service_type: namedRef,
  channel: namedRef,
})

function nameOf(ref: { name: string } | null): string | null {
  return ref ? ref.name : null
}

export function parseTicketDetail(raw: unknown): TicketDetail {
  const row = ticketDetailRowSchema.parse(raw)
  return {
    ...parseTicketListItem(row),
    cycle: row.cycle,
    buildingId: row.building_id,
    locationId: row.location_id,
    dependencyId: row.dependency_id,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    problemId: row.problem_id,
    serviceTypeId: row.service_type_id,
    priorityId: row.priority_id,
    locationName: nameOf(row.location),
    dependencyName: nameOf(row.dependency),
    subcategoryName: nameOf(row.subcategory),
    problemName: nameOf(row.problem),
    serviceTypeName: nameOf(row.service_type),
    channelName: nameOf(row.channel),
    requesterContact: row.requester_contact,
    duplicateOfId: row.duplicate_of_id,
  }
}

const timelineRowSchema = z.object({
  id: z.number(),
  cycle: z.number(),
  type: eventTypeSchema,
  payload: z.record(z.string(), z.unknown()).nullable(),
  occurred_at: z.string(),
  actor_name: z.string().nullable(),
  subject_technician_name: z.string().nullable(),
  reason_name: z.string().nullable(),
})

export function parseTimelineItem(raw: unknown): TicketTimelineItem {
  const row = timelineRowSchema.parse(raw)
  return {
    id: row.id,
    cycle: row.cycle,
    type: row.type,
    occurredAt: row.occurred_at,
    actorName: row.actor_name,
    subjectTechnicianName: row.subject_technician_name,
    reasonName: row.reason_name,
    payload: row.payload ?? {},
  }
}

const manualTimeSpanRowSchema = z.object({
  id: z.string(),
  kind: z.enum(TIME_SPAN_KINDS),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  clock_class: z.enum(CLOCK_CLASSES),
  voided_at: z.string().nullable(),
  technician: z.object({ full_name: z.string() }).nullable(),
})

export function parseManualTimeSpan(raw: unknown): ManualTimeSpan {
  const row = manualTimeSpanRowSchema.parse(raw)
  return {
    id: row.id,
    kind: row.kind,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    clockClass: row.clock_class,
    subjectTechnicianName: row.technician?.full_name ?? null,
    voidedAt: row.voided_at,
  }
}

export const manualTimeSchema = z
  .object({
    kind: z.enum(TIME_SPAN_KINDS),
    clockClass: z.enum(CLOCK_CLASSES),
    technicianId: z.string().optional(),
    startedAt: z.string().min(1),
    endedAt: z.string().min(1),
  })
  .refine((value) => new Date(value.endedAt) > new Date(value.startedAt), {
    path: ['endedAt'],
    message: 'El fin debe ser posterior al inicio.',
  })
export type ManualTimeInput = z.infer<typeof manualTimeSchema>

export const ratingSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
})
export type RatingInput = z.infer<typeof ratingSchema>

const ratingRowSchema = z.object({
  score: z.number(),
  comment: z.string().nullable(),
})

export function parseRating(raw: unknown): TicketRating {
  const row = ratingRowSchema.parse(raw)
  return { score: row.score, comment: row.comment }
}

export const createTicketSchema = z.object({
  buildingId: z.string().min(1, 'Selecciona un edificio.'),
  locationId: z.string().min(1, 'Selecciona una ubicación.'),
  dependencyId: z.string().min(1, 'Selecciona una dependencia.'),
  categoryId: z.string().min(1, 'Selecciona una categoría.'),
  subcategoryId: z.string().optional(),
  problemId: z.string().optional(),
  channelId: z.string().optional(),
  description: z
    .string()
    .trim()
    .min(5, 'Describe el problema con un poco más de detalle.')
    .max(4000),
  requesterId: z.string().min(1, 'Selecciona un solicitante.'),
})
export type CreateTicketInput = z.infer<typeof createTicketSchema>

const optionalSearchString = z.string().optional().catch(undefined)

export const ticketListSearchSchema = z.object({
  status: ticketStatusSchema.optional().catch(undefined),
  buildingId: optionalSearchString,
  categoryId: optionalSearchString,
  search: optionalSearchString,
  page: z.coerce.number().int().min(1).catch(1),
})
export type TicketListSearch = z.infer<typeof ticketListSearchSchema>

const duplicateCandidateSchema = z
  .object({
    folio: z.string().optional(),
    status: ticketStatusSchema.optional(),
    reported_at: z.string().optional(),
    building: z.string().nullable().optional(),
    problem: z.string().nullable().optional(),
    requester_contact: z.string().nullable().optional(),
  })
  .passthrough()

export function parseDuplicateCandidates(raw: unknown): DuplicateCandidate[] {
  const result = z
    .array(duplicateCandidateSchema)
    .safeParse(Array.isArray(raw) ? raw : [])
  return result.success ? result.data : []
}
