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
  occurredAt: z.string().datetime().optional(),
})

export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>
