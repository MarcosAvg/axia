import { z } from 'zod'

const TIME_KINDS = [
  'supervisor_response',
  'reassignment',
  'technician_assignment',
  'recapture',
  'wait_start',
  'active_work',
  'pause',
  'validation',
  'claim',
  'duplicate_review',
] as const
const CLOCK_CLASSES = ['counted', 'not_counted'] as const

export const manualTimeSchema = z.object({
  kind: z.enum(TIME_KINDS),
  clockClass: z.enum(CLOCK_CLASSES),
  technicianId: z.string().uuid().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  replacesSpanId: z.string().uuid().optional(),
  clientRequestId: z.string().uuid(),
})

export type ManualTimeInput = z.infer<typeof manualTimeSchema>
