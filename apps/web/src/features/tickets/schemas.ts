import { z } from 'zod'
import { EVENT_TYPES, TICKET_STATUSES } from './domain/types'
import type { DuplicateCandidate } from './domain/types'

export const ticketStatusSchema = z.enum(TICKET_STATUSES)
const nullableText = z.string().nullable()
const timeConfidenceSchema = z.enum(['trusted', 'unverified', 'corrected'])
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
  locationName: nullableText,
  categoryName: nullableText,
  subcategoryName: nullableText.optional(),
  problemName: nullableText.optional(),
  priorityName: nullableText,
  priorityPosition: z.number().nullable(),
  teamName: nullableText,
  technicianName: nullableText.optional(),
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
const cycleTimesSchema = z.object({
  total: z.number(),
  response: z.number(),
  assignment: z.number(),
  pendingTake: z.number(),
  reassignment: z.number(),
  wait: z.number(),
  active: z.number(),
  pause: z.number(),
  dormant: z.number(),
  validation: z.number(),
  claim: z.number(),
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
    supervisorValidated: z.boolean(),
    canValidateRequester: z.boolean(),
    canValidateSupervisor: z.boolean(),
    hasTaken: z.boolean(),
    validationPolicy: z.enum(['requester', 'supervisor', 'both']),
    cycleTimes: cycleTimesSchema,
    cycleTimesLabor: cycleTimesSchema,
    cycleTimesExtra: cycleTimesSchema,
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
      timeConfidence: timeConfidenceSchema,
    }),
  ),
})
export const timeAlertResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      eventId: z.number().int(),
      eventType: z.enum(EVENT_TYPES),
      kind: z.string(),
      clientClockSkewMs: z.number().nullable(),
      suggestedOccurredAt: z.string().nullable(),
      occurredAt: z.string(),
      detectedAt: z.string(),
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
  occurredLocal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .or(z.literal(''))
    .optional(),
})
export type CreateTicketInput = z.infer<typeof createTicketSchema>

const optionalSearchString = z.string().optional().catch(undefined)
const optionalSearchDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined)
const optionalSearchBoolean = z.preprocess((value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}, z.boolean().optional().catch(undefined))
const optionalStatusList = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : value,
  z.array(ticketStatusSchema).min(1).optional().catch(undefined),
)

export const ticketListSearchSchema = z.object({
  status: ticketStatusSchema.optional().catch(undefined),
  statuses: optionalStatusList,
  buildingId: optionalSearchString,
  categoryId: optionalSearchString,
  subcategoryId: optionalSearchString,
  problemId: optionalSearchString,
  locationId: optionalSearchString,
  channelId: optionalSearchString,
  teamId: optionalSearchString,
  priorityId: optionalSearchString,
  requesterId: optionalSearchString,
  technicianId: optionalSearchString,
  dependencyId: optionalSearchString,
  serviceTypeId: optionalSearchString,
  from: optionalSearchDate,
  to: optionalSearchDate,
  unrouted: optionalSearchBoolean,
  possibleDuplicate: optionalSearchBoolean,
  search: optionalSearchString,
  outcome: z
    .enum(['open', 'closed', 'rejected', 'cancelled', 'duplicate'])
    .optional()
    .catch(undefined),
  sla: z.enum(['met', 'missed', 'with_target']).optional().catch(undefined),
  slaClock: z.enum(['calendar', 'laboral']).optional().catch(undefined),
  rating: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  reassigned: optionalSearchBoolean,
  recaptured: optionalSearchBoolean,
  reopened: optionalSearchBoolean,
  firstFix: optionalSearchBoolean,
  unverifiedTime: optionalSearchBoolean,
  pauseReasonId: optionalSearchString,
  pauseSubstateId: optionalSearchString,
  terminalReasonId: optionalSearchString,
  pendingOffer: optionalSearchBoolean,
  participantTechnicianId: optionalSearchString,
  phase: z
    .enum([
      'total',
      'response',
      'assignment',
      'pending_take',
      'reassignment',
      'wait',
      'active',
      'pause',
      'validation',
      'claim',
      'dormant',
      'resolution',
    ])
    .optional()
    .catch(undefined),
  timeMode: z.enum(['calendar', 'laboral']).optional().catch(undefined),
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
