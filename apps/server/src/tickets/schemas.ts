import { z } from 'zod'

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

export const listTicketsQuerySchema = paginationSchema.extend({
  status: z.enum(TICKET_STATUSES).optional(),
  statuses: statusListSchema,
  buildingId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
})

export const paginationQuerySchema = paginationSchema

export const ticketIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const createTicketSchema = z.object({
  buildingId: z.string().uuid(),
  locationId: z.string().uuid(),
  dependencyId: z.string().uuid(),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  problemId: z.string().uuid().optional(),
  serviceTypeId: z.string().uuid(),
  priorityId: z.string().uuid(),
  channelId: z.string().uuid(),
  description: z.string().trim().min(5).max(4000),
  requesterId: z.string().uuid(),
  requesterName: z.string().trim().min(1).max(120).optional(),
  requesterContact: z.string().trim().min(1).max(120).optional(),
  clientRequestId: z.string().uuid(),
})

export const ticketActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('take'),
    clientRequestId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('assign_technician'),
    technicianId: z.string().uuid(),
    reasonId: z.string().uuid().optional(),
    clientRequestId: z.string().uuid(),
  }),
])
