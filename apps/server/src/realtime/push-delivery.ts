import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'

import { can, loadActor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { scopePredicate } from '../tickets/scope.js'
import { sendWebPush, type Vapid } from './web-push.js'

type Delivery = {
  id: string
  subscription_id: string
  endpoint: string
  p256dh: string
  auth: string
  notification_id: string
  notification_type: string
  recipient_user_id: string
  subscription_user_id: string
  ticket_id: string | null
  active_session: boolean
  attempts: number
  expired: boolean
}

type PushTransaction = Parameters<Parameters<Database['transaction']>[0]>[0]

async function canDeliver(tx: PushTransaction, delivery: Delivery) {
  if (
    delivery.expired ||
    !delivery.active_session ||
    delivery.recipient_user_id !== delivery.subscription_user_id
  )
    return false

  const actor = await loadActor(tx, delivery.recipient_user_id)
  if (!actor || actor.mustChangePassword || !can(actor, 'ticket.view'))
    return false
  if (delivery.ticket_id === null) return true

  const result = await tx.execute(sql`
    select 1 from public.tickets t
    left join public.requesters r on r.id = t.requester_id
    where t.id = ${delivery.ticket_id} and ${scopePredicate(actor, 'ticket.view')}
  `)
  return result.rows.length > 0
}

function deliveryStatus(code: number | null, attempts: number) {
  if (code === null) return 'abandoned'
  if (code >= 200 && code < 300) return 'sent'
  if ((code === 429 || code >= 500) && attempts < 5) return 'pending'
  return 'failed'
}

async function deliverOne(db: Database, vapid: Vapid) {
  return db.transaction(async (tx) => {
    const result = await tx.execute<Delivery>(sql`
      select d.id, d.attempts, p.id as subscription_id, p.endpoint, p.p256dh, p.auth,
             n.id as notification_id, n.type as notification_type,
             p.user_id as subscription_user_id, n.recipient_user_id, n.ticket_id,
             coalesce(s.revoked_at is null and s.expires_at > now() and s.idle_expires_at > now()
               and s.user_id = p.user_id, false) as active_session,
             d.created_at < now() - interval '1 hour' as expired
      from public.notification_deliveries d
      join public.notifications n on n.id = d.notification_id
      join public.push_subscriptions p on p.id = d.push_subscription_id
      left join public.sessions s on s.id = p.session_id
      where d.channel = 'push' and d.status = 'pending'
        and d.next_attempt_at <= now()
      order by d.next_attempt_at, d.id
      limit 1 for no key update of d, p skip locked
    `)
    const delivery = result.rows[0]
    if (!delivery) return false

    const code = (await canDeliver(tx, delivery))
      ? await sendWebPush(vapid, delivery, {
          id: delivery.notification_id,
          type: delivery.notification_type,
        }).catch(() => 503)
      : null
    if (code === 404 || code === 410) {
      await tx.execute(sql`delete from public.push_subscriptions
        where id = ${delivery.subscription_id}`)
      return true
    }

    const attempts = delivery.attempts + 1
    const status = deliveryStatus(code, attempts)
    const error = code !== null && status !== 'sent' ? `HTTP ${code}` : null
    await tx.execute(sql`
      update public.notification_deliveries
      set status = ${status}, attempts = ${attempts}, last_attempt_at = now(),
          sent_at = case when ${status} = 'sent' then now() end,
          next_attempt_at = now() + ${30 * 2 ** delivery.attempts} * interval '1 second',
          last_error = ${error}
      where id = ${delivery.id}
    `)
    return true
  })
}

export function startPushDelivery(
  app: FastifyInstance,
  db: Database,
  vapid: Vapid,
) {
  let running: Promise<void> | undefined
  let closing = false
  const timer = setInterval(() => {
    if (running || closing) return
    running = (async () => {
      for (let i = 0; i < 20 && !closing; i++) {
        if (!(await deliverOne(db, vapid))) break
      }
    })()
      .catch(() => {
        app.log.warn('Web Push delivery queue could not be processed')
      })
      .finally(() => {
        running = undefined
      })
  }, 2000)
  timer.unref()
  app.addHook('preClose', async () => {
    closing = true
    clearInterval(timer)
    await running
  })
}
