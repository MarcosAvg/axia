import { sql } from 'drizzle-orm'

import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { generateSessionToken, hashSessionToken } from './tokens.js'

export type SessionContext = {
  ip?: string | null
  userAgent?: string | null
}

export type AuthenticatedSession = {
  id: string
  userId: string
}

type SessionRow = {
  id: string
  user_id: string
}

export async function createSession(
  db: Database,
  userId: string,
  config: AppConfig,
  context: SessionContext = {},
): Promise<{ id: string; token: string }> {
  const token = generateSessionToken()
  const tokenHash = hashSessionToken(token)
  const result = await db.execute(sql`
    insert into public.sessions (
      user_id, token_hash, expires_at, idle_expires_at, user_agent, ip
    )
    values (
      ${userId},
      ${tokenHash},
      now() + ${config.SESSION_ABSOLUTE_TTL_HOURS} * interval '1 hour',
      now() + ${config.SESSION_IDLE_TTL_HOURS} * interval '1 hour',
      ${context.userAgent ?? null},
      ${context.ip ?? null}
    )
    returning id
  `)
  const row = result.rows[0] as { id: string } | undefined
  if (!row) throw new Error('Session could not be created')
  return { id: row.id, token }
}

export async function loadSession(
  db: Database,
  token: string,
  config: AppConfig,
): Promise<AuthenticatedSession | null> {
  const tokenHash = hashSessionToken(token)
  const result = await db.execute(sql`
    select s.id, s.user_id
    from public.sessions s
    join public.users u on u.id = s.user_id
    where s.token_hash = ${tokenHash}
      and s.revoked_at is null
      and s.expires_at > now()
      and s.idle_expires_at > now()
      and u.active
    limit 1
  `)
  const row = result.rows[0] as SessionRow | undefined
  if (!row) return null

  await db.execute(sql`
    update public.sessions
    set last_used_at = now(),
        idle_expires_at = now() + ${config.SESSION_IDLE_TTL_HOURS} * interval '1 hour'
    where id = ${row.id}
      and last_used_at < now() - ${config.SESSION_TOUCH_INTERVAL_SECONDS} * interval '1 second'
  `)

  return { id: row.id, userId: row.user_id }
}

export async function revokeSession(
  db: Database,
  sessionId: string,
): Promise<void> {
  await db.execute(sql`
    update public.sessions
    set revoked_at = now()
    where id = ${sessionId} and revoked_at is null
  `)
}

export async function revokeUserSessions(
  db: Database,
  userId: string,
  exceptSessionId?: string,
): Promise<void> {
  const exclude = exceptSessionId ? sql`and id <> ${exceptSessionId}` : sql``

  await db.execute(sql`
    update public.sessions
    set revoked_at = now()
    where user_id = ${userId} and revoked_at is null ${exclude}
  `)
}
