import { z } from 'zod'
import { EVENT_TYPES, TICKET_STATUSES } from './domain/types'
import type { DuplicateCandidate } from './domain/types'

export const ticketStatusSchema = z.enum(TICKET_STATUSES)
const nullableText = z.string().nullable()
const ticketListItemSchema = z.object({
  id: z.string(),
  folio: z.string(),
  status: ticketStatusSchema,
  reportedAt: z.string(),
  closedAt: nullableText,
  description: z.string(),
  requesterName: z.string(),
  possibleDuplicate: z.boolean(),
  buildingName: nullableText,
  categoryName: nullableText,
  priorityName: nullableText,
  priorityPosition: z.number().nullable(),
  teamName: nullableText,
  isUnrouted: z.boolean(),
})
export const ticketItemsResponseSchema = z.object({
  items: z.array(ticketListItemSchema),
})
export const ticketPageResponseSchema = ticketItemsResponseSchema.extend({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})
export const ticketDetailResponseSchema = z.object({
  ticket: ticketListItemSchema.extend({
    cycle: z.number().int().positive(),
    buildingId: z.string(),
    locationId: z.string(),
    dependencyId: z.string(),
    categoryId: z.string(),
    subcategoryId: nullableText,
    problemId: nullableText,
    serviceTypeId: nullableText,
    priorityId: z.string(),
    locationName: nullableText,
    dependencyName: nullableText,
    subcategoryName: nullableText,
    problemName: nullableText,
    serviceTypeName: nullableText,
    channelName: nullableText,
    requesterContact: nullableText,
    duplicateOfId: nullableText,
    duplicateOfFolio: nullableText,
    requesterId: z.string(),
    requesterDependencyId: nullableText,
    requesterDependencyName: nullableText,
    isRequester: z.boolean(),
    requesterValidated: z.boolean(),
    hasTaken: z.boolean(),
    validationPolicy: z.enum(['requester', 'supervisor', 'both']),
    cycleTimes: z.object({
      total: z.number(),
      response: z.number(),
      assignment: z.number(),
      pendingTake: z.number(),
      reassignment: z.number(),
      wait: z.number(),
      active: z.number(),
      pause: z.number(),
      validation: z.number(),
      claim: z.number(),
    }),
  }),
})
export const timelineResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      cycle: z.number().int().positive(),
      type: z.enum(EVENT_TYPES),
      payload: z
        .record(z.string(), z.unknown())
        .nullable()
        .transform((payload) => payload ?? {}),
      occurredAt: z.string(),
      actorName: nullableText,
      subjectUserName: nullableText,
      subjectTechnicianName: nullableText,
      subjectRequesterName: nullableText,
      reasonName: nullableText,
    }),
  ),
})
export const ratingResponseSchema = z.object({
  item: z
    .object({
      score: z.number().int().min(1).max(5),
      comment: nullableText,
    })
    .nullable(),
})

export const ratingSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
})
export type RatingInput = z.infer<typeof ratingSchema>

export const createTicketSchema = z.object({
  buildingId: z.string().min(1, 'Selecciona un edificio.'),
  locationId: z.string().min(1, 'Selecciona una ubicación.'),
  dependencyId: z.string().min(1, 'Selecciona una dependencia.'),
  categoryId: z.string().min(1, 'Selecciona una categoría.'),
  subcategoryId: z.string().min(1, 'Selecciona una subcategoría.'),
  problemId: z.string().min(1, 'Selecciona un problema.'),
  channelId: z.string().optional(),
  description: z
    .string()
    .trim()
    .min(5, 'Describe el problema con un poco más de detalle.')
    .max(4000),
  requesterId: z.string().min(1, 'Selecciona un solicitante.'),
  occurredAt: z.string().optional(),
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
    id: z.string(),
    score: z.number(),
    similarity: z.number(),
    reasons: z.array(z.string()).catch([]),
    decision: z.enum(['ignored', 'linked', 'dismissed']).nullable().optional(),
    decided_at: z.string().nullable().optional(),
    folio: z.string().optional(),
    status: ticketStatusSchema.optional(),
    reported_at: z.string().optional(),
    building: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    problem: z.string().nullable().optional(),
    subcategory: z.string().nullable().optional(),
    dependency: z.string().nullable().optional(),
    requester_contact: z.string().nullable().optional(),
  })
  .passthrough()

export function parseDuplicateCandidates(raw: unknown): DuplicateCandidate[] {
  const result = z
    .array(duplicateCandidateSchema)
    .safeParse(Array.isArray(raw) ? raw : [])
  return result.success ? result.data : []
}
