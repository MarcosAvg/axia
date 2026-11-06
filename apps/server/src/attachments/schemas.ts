import { z } from 'zod'

export const createAttachmentSchema = z.object({
  clientRequestId: z.string().uuid(),
  problemId: z.string().uuid(),
  ticketId: z.string().uuid().optional(),
  fileName: z.string().trim().min(1).max(255),
  declaredMimeType: z.string().trim().min(1).max(160),
  sizeBytes: z.number().int().positive(),
})

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>
