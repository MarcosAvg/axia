import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import {
  authGuards,
  currentActor,
  requirePermission,
  type Guard,
} from '../auth/guards.js'
import type { AuthService } from '../auth/service.js'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { runSync } from './service.js'

const itemSchema = z.object({
  clientRequestId: z.string().uuid(),
  ticketId: z.string().uuid(),
  type: z.string().min(1).max(50),
  args: z.record(z.string(), z.unknown()).default({}),
  occurredAt: z.string().min(1).max(80),
  manualTime: z.boolean().optional(),
})

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(100),
})

export type SyncRoutesOptions = {
  auth: AuthService
  config: AppConfig
  db: Database
}

export function registerSyncRoutes(
  app: FastifyInstance,
  { auth, config, db }: SyncRoutesOptions,
) {
  const active = authGuards(auth, config, false)
  const canView: Guard[] = [active, requirePermission('ticket.view')]

  app.post('/api/sync/actions', { preHandler: canView }, async (request) => {
    const body = bodySchema.parse(request.body)
    return {
      results: await runSync(db, currentActor(request), config, body.items),
    }
  })
}
