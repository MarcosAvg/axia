import { extname } from 'node:path'

import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify'

export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

type ApiErrorBody = {
  error: {
    code: string
    message: string
    details?: unknown
  }
  requestId: string
}

type ApiErrorOptions = {
  reply: FastifyReply
  request: FastifyRequest
  statusCode: number
  code: string
  message: string
  details?: unknown
}

function sendApiError({
  reply,
  request,
  statusCode,
  code,
  message,
  details,
}: ApiErrorOptions): FastifyReply {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
    requestId: request.id,
  }

  return reply.status(statusCode).send(body)
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  if (error instanceof AppError) {
    return sendApiError({
      reply,
      request,
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
    })
  }

  if (error.validation) {
    return sendApiError({
      reply,
      request,
      statusCode: 400,
      code: 'validation_error',
      message: 'La petición no es válida',
    })
  }

  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return sendApiError({
      reply,
      request,
      statusCode: error.statusCode,
      code: 'request_error',
      message: error.message,
    })
  }

  request.log.error({ err: error }, 'unhandled request error')
  return sendApiError({
    reply,
    request,
    statusCode: 500,
    code: 'internal_error',
    message: 'Error interno del servidor',
  })
}

function looksLikeFile(pathname: string): boolean {
  return extname(pathname) !== ''
}

function requestPath(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname
  } catch {
    return url
  }
}

export function registerNotFoundHandler(
  app: FastifyInstance,
  staticDir?: string,
) {
  app.setNotFoundHandler((request, reply) => {
    const pathname = requestPath(request.url)
    const isApi =
      pathname === '/api' ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/api?')

    if (
      request.method === 'GET' &&
      staticDir &&
      !isApi &&
      !looksLikeFile(pathname)
    ) {
      return reply
        .type('text/html; charset=utf-8')
        .header('cache-control', 'no-cache')
        .sendFile('index.html')
    }

    return sendApiError({
      reply,
      request,
      statusCode: 404,
      code: 'not_found',
      message: 'Recurso no encontrado',
    })
  })
}
