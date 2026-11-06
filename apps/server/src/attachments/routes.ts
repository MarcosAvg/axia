import type { FastifyInstance } from 'fastify'

import type { AuthService } from '../auth/service.js'
import { authGuards, currentActor } from '../auth/guards.js'
import type { AppConfig } from '../config.js'
import { createAttachmentSchema } from './schemas.js'
import type { AttachmentService } from './service.js'

export type AttachmentRoutesOptions = {
  auth: AuthService
  config: AppConfig
  attachments: AttachmentService
}

export function registerAttachmentRoutes(
  app: FastifyInstance,
  { auth, config, attachments }: AttachmentRoutesOptions,
) {
  const active = authGuards(auth, config, false)

  app.post(
    '/api/attachments',
    { preHandler: active },
    async (request, reply) => {
      const input = createAttachmentSchema.parse(request.body)
      const result = await attachments.create(currentActor(request), input)
      return reply.status(result.replayed ? 200 : 201).send({
        attachment: { id: result.attachmentId },
        uploadUrl: result.uploadUrl,
        maxSize: result.maxSize,
        quotaRemaining: result.quotaRemaining,
        replayed: result.replayed,
      })
    },
  )
}
