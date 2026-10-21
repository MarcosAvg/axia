import type { FastifyInstance } from 'fastify'

export type ReadinessProbe = () => Promise<void>

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Health check timed out'))
    }, timeoutMs)
    timer.unref()

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export function registerHealthRoutes(
  app: FastifyInstance,
  readiness: ReadinessProbe,
  timeoutMs: number,
) {
  app.get('/api/health/live', async (_request, reply) => {
    reply.header('cache-control', 'no-store')
    return { status: 'ok' }
  })

  app.get('/api/health/ready', async (request, reply) => {
    reply.header('cache-control', 'no-store')

    try {
      await withTimeout(readiness(), timeoutMs)
      return { status: 'ready' }
    } catch (error) {
      request.log.warn({ err: error }, 'readiness check failed')
      return reply.status(503).send({ status: 'not_ready' })
    }
  })
}
