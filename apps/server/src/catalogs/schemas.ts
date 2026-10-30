import { z } from 'zod'

import { CATALOG_NAMES, REASON_USES } from './names.js'

export const catalogParamsSchema = z.object({
  catalog: z.enum(CATALOG_NAMES),
})

export const catalogQuerySchema = z.object({
  buildingId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  use: z.enum(REASON_USES).optional(),
})
