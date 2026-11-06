import { FileStore } from '@tus/file-store'
import { Server, type ServerOptions, type Upload } from '@tus/server'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import type { Actor } from '../auth/authorization.js'
import type { AuthService } from '../auth/service.js'
import type { AppConfig } from '../config.js'
import { AppError } from '../http/errors.js'
import { processAttachment } from './process.js'
import type { AttachmentService } from './service.js'

type TusRequest = Parameters<NonNullable<ServerOptions['onIncomingRequest']>>[0]

function tusError(statusCode: number, message: string): never {
  throw { status_code: statusCode, body: message }
}

function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

async function authenticate(
  request: TusRequest,
  auth: AuthService,
  config: AppConfig,
): Promise<Actor> {
  const token = cookieValue(
    request.headers.get('cookie'),
    config.SESSION_COOKIE_NAME,
  )
  if (!token) tusError(401, 'Inicia sesión para continuar')
  const result = await auth.authenticate(token)
  if (!result) tusError(401, 'La sesión no es válida')
  if (result.actor.mustChangePassword) {
    tusError(403, 'Debes cambiar la contraseña antes de continuar')
  }
  return result.actor
}

function attachmentIdFromMetadata(upload: Upload): string {
  const id = upload.metadata?.attachmentId
  if (!id) tusError(400, 'Falta attachmentId en los metadatos')
  return id
}

type TusContext = {
  auth: AuthService
  config: AppConfig
  attachments: AttachmentService
}

async function onIncoming(
  request: TusRequest,
  uploadId: string,
  context: TusContext,
) {
  const actor = await authenticate(request, context.auth, context.config)
  if (request.method === 'DELETE') {
    tusError(405, 'Los adjuntos no se eliminan')
  }
  const row = await context.attachments.findForTus(uploadId)
  if (!row || row.uploaded_by !== actor.id) {
    tusError(404, 'Adjunto no encontrado')
  }
}

async function onUploadCreate(
  request: TusRequest,
  upload: Upload,
  context: TusContext,
) {
  const actor = await authenticate(request, context.auth, context.config)
  const attachmentId = attachmentIdFromMetadata(upload)
  const row = await context.attachments.findForTus(attachmentId)
  if (!row || row.uploaded_by !== actor.id || row.ticket_id !== null) {
    tusError(404, 'Adjunto no encontrado')
  }
  if (row.processing_state !== 'pending') {
    tusError(409, 'El adjunto ya fue procesado')
  }
  if ((upload.size ?? 0) > context.config.ATTACHMENT_MAX_BYTES) {
    tusError(413, 'El archivo supera el tamaño máximo')
  }
  const used = await context.attachments.quotaForUploader(
    actor.id,
    attachmentId,
  )
  if (used + (upload.size ?? 0) > context.config.ATTACHMENT_QUOTA_BYTES) {
    tusError(413, 'Has alcanzado tu cuota de adjuntos')
  }
  return {}
}

async function onUploadFinish(
  _request: TusRequest,
  upload: Upload,
  context: TusContext,
) {
  try {
    await processAttachment(context.attachments, context.config, upload.id)
    return {}
  } catch (error) {
    if (error instanceof AppError) {
      tusError(error.statusCode, error.message)
    }
    tusError(500, 'No se pudo procesar el adjunto')
  }
}

function tusOptions(
  auth: AuthService,
  config: AppConfig,
  attachments: AttachmentService,
): ConstructorParameters<typeof Server>[0] {
  const context = { auth, config, attachments }
  return {
    path: '/api/attachment-uploads',
    datastore: new FileStore({ directory: attachments.paths.uploads }),
    maxSize: config.ATTACHMENT_MAX_BYTES,
    respectForwardedHeaders: config.TRUST_PROXY,
    disableTerminationForFinishedUploads: true,
    namingFunction: (_request, metadata) => {
      const id = metadata?.attachmentId
      if (!id) tusError(400, 'Falta attachmentId en los metadatos')
      return id
    },
    onIncomingRequest: (request, uploadId) =>
      onIncoming(request, uploadId, context),
    onUploadCreate: (request, upload) =>
      onUploadCreate(request, upload, context),
    onUploadFinish: (request, upload) =>
      onUploadFinish(request, upload, context),
  }
}

function registerRoutes(app: FastifyInstance, server: Server) {
  const onRequest = async (request: FastifyRequest, reply: FastifyReply) => {
    reply.hijack()
    await server.handle(request.raw, reply.raw)
  }
  const handler = async () => {}
  for (const url of ['/api/attachment-uploads', '/api/attachment-uploads/*']) {
    app.route({
      method: ['POST', 'PATCH', 'HEAD', 'OPTIONS', 'GET', 'DELETE'],
      url,
      onRequest,
      handler,
    })
  }
}

export function createAttachmentTusServer(
  app: FastifyInstance,
  auth: AuthService,
  config: AppConfig,
  attachments: AttachmentService,
) {
  const server = new Server(tusOptions(auth, config, attachments))
  registerRoutes(app, server)
}
