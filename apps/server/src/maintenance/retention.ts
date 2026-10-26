import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'

export type RetentionOptions = {
  sessionDays?: number
  loginAttemptDays?: number
  notificationDays?: number
}

export type RetentionResult = {
  sessions: number
  loginAttempts: number
  notifications: number
}

/**
 * Borra datos operativos antiguos. La bitácora de tiquets no se toca: es
 * append-only. Los avisos no leídos se conservan aunque sean antiguos.
 */
export async function cleanupRetention(
  db: Database,
  {
    sessionDays = 30,
    loginAttemptDays = 90,
    notificationDays = 90,
  }: RetentionOptions = {},
): Promise<RetentionResult> {
  const sessions = await db.execute(sql`
    delete from public.sessions
    where expires_at < now() - ${sessionDays} * interval '1 day'
      or idle_expires_at < now() - ${sessionDays} * interval '1 day'
      or revoked_at < now() - ${sessionDays} * interval '1 day'
  `)
  const loginAttempts = await db.execute(sql`
    delete from public.login_attempts
    where attempted_at < now() - ${loginAttemptDays} * interval '1 day'
  `)
  const notifications = await db.execute(sql`
    delete from public.notifications
    where read_at is not null
      and read_at < now() - ${notificationDays} * interval '1 day'
  `)
  return {
    sessions: sessions.rowCount ?? 0,
    loginAttempts: loginAttempts.rowCount ?? 0,
    notifications: notifications.rowCount ?? 0,
  }
}
