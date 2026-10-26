import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createDb, type Database } from '../../src/db/client.js'
import { cleanupRetention } from '../../src/maintenance/retention.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

let db: Database
let close: () => Promise<void>

beforeAll(async () => {
  await prepareTestDatabase()
  const created = createDb(ownerConnectionString())
  db = created.db
  close = () => created.pool.end()
}, 60_000)

afterAll(async () => {
  await close()
})

describe('retention cleanup', () => {
  it('deletes old sessions, login attempts and read notifications', async () => {
    const user = await db.execute(sql`
      insert into public.users (username, full_name, password_hash)
      values ('retention-user', 'Retención', 'x')
      returning id
    `)
    const userId = (user.rows[0] as { id: string }).id

    await db.execute(sql`
      insert into public.sessions (
        user_id, token_hash, expires_at, idle_expires_at, revoked_at
      ) values
        (${userId}, ${randomUUID()}, now() + interval '1 day', now() + interval '1 day', null),
        (${userId}, ${randomUUID()}, now() - interval '40 days', now() + interval '1 day', null),
        (${userId}, ${randomUUID()}, now() + interval '1 day', now() + interval '1 day', now() - interval '40 days')
    `)
    await db.execute(sql`
      insert into public.login_attempts (username, user_id, successful, attempted_at)
      values
        ('retention-user', ${userId}, false, now() - interval '100 days'),
        ('retention-user', ${userId}, true, now())
    `)
    await db.execute(sql`
      insert into public.notifications (recipient_user_id, type, read_at)
      values
        (${userId}, 'created', now() - interval '100 days'),
        (${userId}, 'created', now() - interval '100 days'),
        (${userId}, 'created', now())
    `)
    await db.execute(sql`
      update public.notifications
      set read_at = null
      where id = (
        select id from public.notifications
        where recipient_user_id = ${userId}
        order by created_at
        limit 1
      )
    `)

    const result = await cleanupRetention(db)

    expect(result).toEqual({
      sessions: 2,
      loginAttempts: 1,
      notifications: 1,
    })

    const sessions = await db.execute(sql`
      select count(*)::int as count from public.sessions where user_id = ${userId}
    `)
    const attempts = await db.execute(sql`
      select count(*)::int as count from public.login_attempts where user_id = ${userId}
    `)
    const notifications = await db.execute(sql`
      select count(*)::int as count from public.notifications where recipient_user_id = ${userId}
    `)
    expect(sessions.rows[0]).toEqual({ count: 1 })
    expect(attempts.rows[0]).toEqual({ count: 1 })
    expect(notifications.rows[0]).toEqual({ count: 2 })
  })
})
