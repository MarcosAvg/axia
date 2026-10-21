import { extname } from 'node:path'

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

export type AppErrorOptions = {
  details?: unknown
  headers?: Record<string, string>
}

export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown
  readonly headers?: Record<string, string>

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: AppErrorOptions,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = options?.details
    this.headers = options?.headers
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
  headers?: Record<string, string>
}

function sendApiError({
  reply,
  request,
  statusCode,
  code,
  message,
  details,
  headers,
}: ApiErrorOptions): FastifyReply {
  if (headers) reply.headers(headers)

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

function errorStatusCode(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    return error.statusCode
  }
  return undefined
}

function isValidationError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'validation' in error &&
    Boolean(error.validation)
  )
}

export function errorHandler(
  error: unknown,
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
      headers: error.headers,
    })
  }

  if (error instanceof ZodError) {
    return sendApiError({
      reply,
      request,
      statusCode: 400,
      code: 'validation_error',
      message: 'La petición no es válida',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }

  if (isValidationError(error)) {
    return sendApiError({
      reply,
      request,
      statusCode: 400,
      code: 'validation_error',
      message: 'La petición no es válida',
    })
  }

  const statusCode = errorStatusCode(error)
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return sendApiError({
      reply,
      request,
      statusCode,
      code: 'request_error',
      message: error instanceof Error ? error.message : 'Petición inválida',
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
