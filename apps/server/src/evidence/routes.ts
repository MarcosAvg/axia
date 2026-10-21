import { createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'

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
import { AppError } from '../http/errors.js'
import { ticketIdParamsSchema } from '../tickets/schemas.js'
import { createEvidenceSchema } from './schemas.js'
import type { EvidenceService } from './service.js'

const evidenceIdParamsSchema = z.object({ id: z.string().uuid() })

export type EvidenceRoutesOptions = {
  auth: AuthService
  config: AppConfig
  evidence: EvidenceService
}

function notFound(): AppError {
  return new AppError(404, 'not_found', 'Evidencia no encontrada')
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export function registerEvidenceRoutes(
  app: FastifyInstance,
  { auth, config, evidence }: EvidenceRoutesOptions,
) {
  const active = authGuards(auth, config, false)
  const canView: Guard[] = [active, requirePermission('ticket.view')]

  app.post(
    '/api/tickets/:id/evidence',
    { preHandler: active },
    async (request, reply) => {
      const { id } = ticketIdParamsSchema.parse(request.params)
      const input = createEvidenceSchema.parse(request.body)
      const result = await evidence.create(currentActor(request), id, input)
      return reply.status(result.replayed ? 200 : 201).send({
        evidence: { id: result.evidenceId },
        uploadUrl: result.uploadUrl,
        maxSize: result.maxSize,
        quotaRemaining: result.quotaRemaining,
        replayed: result.replayed,
      })
    },
  )

  app.get(
    '/api/tickets/:id/evidence',
    { preHandler: canView },
    async (request) => {
      const { id } = ticketIdParamsSchema.parse(request.params)
      const items = await evidence.list(currentActor(request), id)
      if (!items) throw notFound()
      return { items }
    },
  )

  for (const [path, thumbnail] of [
    ['/api/evidence/:id/file', false],
    ['/api/evidence/:id/thumbnail', true],
  ] as const) {
    app.get(path, { preHandler: canView }, async (request, reply) => {
      const { id } = evidenceIdParamsSchema.parse(request.params)
      const file = await evidence.file(currentActor(request), id, thumbnail)
      if (!file || !(await exists(file.path))) throw notFound()
      return reply
        .type(file.mimeType)
        .header('cache-control', 'private, max-age=60')
        .send(createReadStream(file.path))
    })
  }
}
