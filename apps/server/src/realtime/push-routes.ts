import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { authGuards, currentActor, requirePermission } from '../auth/guards.js'
import { AppError } from '../http/errors.js'
import type { NotificationRoutesOptions } from './notifications.js'
import { startPushDelivery } from './push-delivery.js'
import { createVapid, pushEndpoint } from './web-push.js'

const subscriptionSchema = z.object({
  endpoint: z
    .string()
    .max(2048)
    .refine((endpoint) => pushEndpoint(endpoint) !== null),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  }),
})

export function registerPushRoutes(
  app: FastifyInstance,
  { auth, config, db }: NotificationRoutesOptions,
) {
  const key = config.WEB_PUSH_PRIVATE_KEY
  const contact = config.WEB_PUSH_CONTACT
  if (Boolean(key) !== Boolean(contact)) {
    throw new Error(
      'Web Push requires both WEB_PUSH_PRIVATE_KEY and WEB_PUSH_CONTACT',
    )
  }
  const vapid = key && contact ? createVapid(key, contact) : null
  const preHandler = [
    authGuards(auth, config, false),
    requirePermission('ticket.view'),
  ]

  app.get('/api/notifications/push', { preHandler }, async () => ({
    publicKey: vapid?.publicKey ?? null,
  }))

  app.put('/api/notifications/push', { preHandler }, async (request, reply) => {
    if (!vapid)
      throw new AppError(
        503,
        'push_unavailable',
        'Web Push no está configurado',
      )
    const { endpoint, keys } = subscriptionSchema.parse(request.body)
    const userId = currentActor(request).id

    await db
      .execute(
        sql`
      insert into public.push_subscriptions (user_id, session_id, endpoint, p256dh, auth)
      values (${userId}, ${request.sessionId}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
      on conflict (endpoint) do update
      set user_id = excluded.user_id, session_id = excluded.session_id,
          p256dh = excluded.p256dh, auth = excluded.auth
    `,
      )
      .catch(() => {
        request.log.warn('Web Push subscription could not be stored')
        throw new AppError(
          503,
          'push_unavailable',
          'No se pudo registrar este dispositivo',
        )
      })
    return reply.status(204).send()
  })

  if (vapid) startPushDelivery(app, db, vapid)
}
