import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { authGuards, requirePermission, type Guard } from '../auth/guards.js'
import type { AuthService } from '../auth/service.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { getSettings, updateSettings } from './settings.js'

const settingsSchema = z.object({
  team_label: z.string().trim().min(1).max(80),
  validation_policy: z.enum(['requester', 'supervisor', 'both']),
  auto_validation_days: z.number().int().positive().nullable(),
  claim_window: z.string().min(1).max(40),
  request_evidence_policy: z.enum(['optional', 'recommended', 'required']),
  folio_pattern: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(80),
  default_calendar_id: z.string().uuid().nullable(),
  sla_clock_mode: z.enum(['calendar', 'laboral']),
  requester_visible_event_types: z.array(z.string()).min(1),
  default_priority_id: z.string().uuid().nullable(),
})

export function registerAdminSettingsRoutes(
  app: FastifyInstance,
  auth: AuthService,
  config: AppConfig,
  db: Database,
) {
  const guard: Guard[] = [
    authGuards(auth, config, false),
    requirePermission('catalog.manage'),
  ]

  app.get('/api/admin/settings', { preHandler: guard }, async () => ({
    settings: await getSettings(db),
  }))

  app.patch(
    '/api/admin/settings',
    { preHandler: guard },
    async (request, reply) => {
      await updateSettings(db, settingsSchema.parse(request.body))
      return reply.status(204).send()
    },
  )
}
