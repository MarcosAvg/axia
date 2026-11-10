import { z } from 'zod'

const EVIDENCE_TYPES = [
  'request',
  'before',
  'during',
  'after',
  'claim',
  'other',
] as const

export const createEvidenceSchema = z.object({
  type: z.enum(EVIDENCE_TYPES),
  clientRequestId: z.string().uuid(),
  mimeType: z.string().trim().max(120).optional(),
  sizeBytes: z.number().int().positive().optional(),
  occurredLocal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .optional(),
  occurredAt: z.string().datetime().optional(),
  clientCapturedAt: z.string().datetime().optional(),
  deviceNow: z.string().datetime().optional(),
  subjectTechnicianId: z.string().uuid().optional(),
})

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>
