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
import { createAttachmentSchema } from './schemas.js'
import type { AttachmentService } from './service.js'

const attachmentIdParamsSchema = z.object({ id: z.string().uuid() })

export type AttachmentRoutesOptions = {
  auth: AuthService
  config: AppConfig
  attachments: AttachmentService
}

function notFound(): AppError {
  return new AppError(404, 'not_found', 'Adjunto no encontrado')
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Nombre ASCII para `filename=` y el nombre completo codificado para `filename*`. */
function contentDisposition(fileName: string): string {
  const ascii =
    fileName
      .replace(/[^\x20-\x7e]/g, '_')
      .replace(/["\\\r\n]/g, '_')
      .slice(0, 120) || 'adjunto'
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

export function registerAttachmentRoutes(
  app: FastifyInstance,
  { auth, config, attachments }: AttachmentRoutesOptions,
) {
  const active = authGuards(auth, config, false)
  const canView: Guard[] = [active, requirePermission('ticket.view')]

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

  app.get(
    '/api/tickets/:id/attachments',
    { preHandler: canView },
    async (request) => {
      const { id } = ticketIdParamsSchema.parse(request.params)
      const items = await attachments.listForTicket(currentActor(request), id)
      if (!items) throw notFound()
      return { items }
    },
  )

  app.get(
    '/api/attachments/:id/file',
    { preHandler: canView },
    async (request, reply) => {
      const { id } = attachmentIdParamsSchema.parse(request.params)
      const file = await attachments.fileForTicket(currentActor(request), id)
      if (!file || !(await exists(file.path))) throw notFound()
      return reply
        .type(file.mimeType)
        .header('content-disposition', contentDisposition(file.fileName))
        .header('x-content-type-options', 'nosniff')
        .header('content-security-policy', 'sandbox')
        .header('cache-control', 'private, no-store')
        .send(createReadStream(file.path))
    },
  )
}
