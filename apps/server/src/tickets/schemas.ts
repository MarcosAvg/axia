import { z } from 'zod'
import { phaseFilterFields, refinePhaseFilters } from './phase-filter-schema.js'

const TICKET_STATUSES = [
  'registered',
  'with_supervisor',
  'assigned',
  'in_progress',
  'paused',
  'attended',
  'under_claim',
  'closed',
  'rejected',
  'cancelled',
  'duplicate',
] as const

const statusListSchema = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : value,
  z.array(z.enum(TICKET_STATUSES)).min(1).optional(),
)

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()

const optionalBoolean = z.preprocess((value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}, z.boolean().optional())

export const listTicketsQuerySchema = paginationSchema
  .extend({
    status: z.enum(TICKET_STATUSES).optional(),
    statuses: statusListSchema,
    buildingId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    subcategoryId: z.string().uuid().optional(),
    problemId: z.string().uuid().optional(),
    locationId: z.string().uuid().optional(),
    channelId: z.string().uuid().optional(),
    teamId: z.string().uuid().optional(),
    priorityId: z.string().uuid().optional(),
    requesterId: z.string().uuid().optional(),
    technicianId: z.string().uuid().optional(),
    dependencyId: z.string().uuid().optional(),
    serviceTypeId: z.string().uuid().optional(),
    from: optionalDate,
    to: optionalDate,
    unrouted: optionalBoolean,
    possibleDuplicate: optionalBoolean,
    search: z.string().trim().max(100).optional(),
    outcome: z
      .enum(['open', 'closed', 'rejected', 'cancelled', 'duplicate'])
      .optional(),
    sla: z.enum(['met', 'missed', 'with_target']).optional(),
    slaClock: z.enum(['calendar', 'laboral']).optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    reassigned: optionalBoolean,
    recaptured: optionalBoolean,
    reopened: optionalBoolean,
    firstFix: optionalBoolean,
    unverifiedTime: optionalBoolean,
    pauseReasonId: z.string().uuid().optional(),
    pauseSubstateId: z.string().uuid().optional(),
    terminalReasonId: z.string().uuid().optional(),
    pendingOffer: optionalBoolean,
    participantTechnicianId: z.string().uuid().optional(),
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
      .optional(),
    timeMode: z.enum(['calendar', 'laboral']).optional(),
    ...phaseFilterFields,
  })
  .superRefine(refinePhaseFilters)

export const paginationQuerySchema = paginationSchema

export const ticketIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const duplicateCheckSchema = z.object({
  buildingId: z.string().uuid(),
  locationId: z.string().uuid(),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  problemId: z.string().uuid().optional(),
  dependencyId: z.string().uuid(),
  description: z.string().trim().min(5).max(4000),
})

const occurredLocal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  .optional()

export const createTicketSchema = z.object({
  buildingId: z.string().uuid(),
  locationId: z.string().uuid(),
  dependencyId: z.string().uuid(),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid(),
  problemId: z.string().uuid(),
  serviceTypeId: z.string().uuid().optional(),
  priorityId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  description: z.string().trim().min(5).max(4000),
  requesterId: z.string().uuid(),
  requesterName: z.string().trim().min(1).max(120).optional(),
  requesterContact: z.string().trim().min(1).max(120).optional(),
  occurredLocal,
  occurredAt: z.string().datetime().optional(),
  clientRequestId: z.string().uuid(),
  attachmentId: z.string().uuid().optional(),
  shownCandidateIds: z.array(z.string().uuid()).max(20).optional(),
})

const actionBase = {
  clientRequestId: z.string().uuid(),
  occurredLocal,
  occurredAt: z.string().datetime().optional(),
}

const proxyBase = {
  subjectTechnicianId: z.string().uuid().optional(),
}

const requesterProxyBase = {
  subjectRequesterId: z.string().uuid().optional(),
}

export const ticketActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('take'),
    ...actionBase,
  }),
  z.object({
    action: z.literal('assign_technician'),
    technicianId: z.string().uuid(),
    reasonId: z.string().uuid().optional(),
    ...actionBase,
  }),
  z.object({
    action: z.literal('start'),
    ...proxyBase,
    ...actionBase,
  }),
  z.object({
    action: z.literal('attend'),
    workDescription: z.string().trim().min(5).max(4000),
    serviceTypeId: z.string().uuid().optional(),
    ...proxyBase,
    ...actionBase,
  }),
  z.object({
    action: z.literal('validate'),
    role: z.enum(['requester', 'supervisor']).optional(),
    ...requesterProxyBase,
    ...actionBase,
  }),
  z.object({
    action: z.literal('reject'),
    reasonId: z.string().uuid(),
    note: z.string().trim().max(2000).optional(),
    ...actionBase,
  }),
  z.object({
    action: z.literal('cancel'),
    reasonId: z.string().uuid(),
    note: z.string().trim().max(2000).optional(),
    ...requesterProxyBase,
    ...actionBase,
  }),
  z.object({
    action: z.literal('change_priority'),
    priorityId: z.string().uuid(),
    ...actionBase,
  }),
  z.object({
    action: z.literal('comment'),
    text: z.string().trim().min(1).max(4000),
    ...actionBase,
  }),
  z.object({
    action: z.literal('mark_duplicate'),
    originalId: z.string().uuid(),
    ...actionBase,
  }),
  z.object({
    action: z.literal('reactivate'),
    reasonId: z.string().uuid(),
    ...actionBase,
  }),
  z.object({
    action: z.literal('pause'),
    reasonId: z.string().uuid(),
    note: z.string().trim().max(2000).optional(),
    estimatedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    ...proxyBase,
    ...actionBase,
  }),
  z.object({
    action: z.literal('advance_pause'),
    reasonId: z.string().uuid(),
    note: z.string().trim().max(2000).optional(),
    ...proxyBase,
    ...actionBase,
  }),
  z.object({
    action: z.literal('resume'),
    reasonId: z.string().uuid(),
    ...proxyBase,
    ...actionBase,
  }),
  z.object({
    action: z.literal('recapture'),
    changes: z
      .object({
        buildingId: z.string().uuid().optional(),
        locationId: z.string().uuid().optional(),
        dependencyId: z.string().uuid().optional(),
        categoryId: z.string().uuid().optional(),
        subcategoryId: z.string().uuid().nullable().optional(),
        problemId: z.string().uuid().nullable().optional(),
        serviceTypeId: z.string().uuid().nullable().optional(),
        priorityId: z.string().uuid().optional(),
        description: z.string().trim().min(5).max(4000).optional(),
      })
      .refine((changes) => Object.keys(changes).length > 0, {
        message: 'Indica al menos un cambio',
      }),
    reasonId: z.string().uuid().optional(),
    note: z.string().trim().max(2000).optional(),
    attachmentId: z.string().uuid().optional(),
    ...proxyBase,
    ...actionBase,
  }),
  z.object({
    action: z.literal('open_claim'),
    reasonId: z.string().uuid(),
    description: z.string().trim().min(5).max(4000),
    ...requesterProxyBase,
    ...actionBase,
  }),
  z.object({
    action: z.literal('resolve_claim'),
    resolution: z.enum(['upheld', 'dismissed', 'new_ticket']),
    resultId: z.string().uuid().optional(),
    note: z.string().trim().max(2000).optional(),
    ...actionBase,
  }),
  z.object({
    action: z.literal('assign_supervisor'),
    reasonId: z.string().uuid(),
    supervisorUserId: z.string().uuid().optional(),
    teamId: z.string().uuid().optional(),
    note: z.string().trim().max(2000).optional(),
    ...actionBase,
  }),
  z.object({
    action: z.literal('add_auxiliary'),
    technicianId: z.string().uuid(),
    reasonId: z.string().uuid(),
    note: z.string().trim().max(2000).optional(),
    ...actionBase,
  }),
  z.object({
    action: z.literal('rate'),
    score: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
    ...requesterProxyBase,
    ...actionBase,
  }),
])

export type TicketActionInput = z.infer<typeof ticketActionSchema>
