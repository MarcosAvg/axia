import { sql } from 'drizzle-orm'

import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'

type LockoutRow = {
  user_attempts: number
  ip_attempts: number
  last_attempt: Date | string | null
}

type Attempt = {
  username: string
  userId?: string | null
  ip?: string | null
  successful: boolean
}

function retryAfterSeconds(
  lastAttempt: Date | string | null,
  windowMinutes: number,
): number {
  if (!lastAttempt) return windowMinutes * 60
  const unlockAt = new Date(lastAttempt).getTime() + windowMinutes * 60_000
  return Math.max(1, Math.ceil((unlockAt - Date.now()) / 1_000))
}

export async function assertNotLocked(
  db: Database,
  config: AppConfig,
  username: string,
  ip?: string | null,
): Promise<void> {
  const result = await db.execute(sql`
    select
      (select count(*)::int
       from public.login_attempts
       where username = ${username}
         and successful = false
         and attempted_at > now() - ${config.LOGIN_WINDOW_MINUTES} * interval '1 minute'
         and ip is not distinct from ${ip}::inet) as user_attempts,
      (select count(*)::int
       from public.login_attempts
       where successful = false
         and attempted_at > now() - ${config.LOGIN_WINDOW_MINUTES} * interval '1 minute'
         and ip = ${ip}::inet) as ip_attempts,
      (select max(attempted_at)
       from public.login_attempts
       where username = ${username}
         and successful = false
         and attempted_at > now() - ${config.LOGIN_WINDOW_MINUTES} * interval '1 minute'
         and ip is not distinct from ${ip}::inet) as last_attempt
  `)
  const row = result.rows[0] as LockoutRow | undefined
  if (!row) return

  if (
    row.user_attempts >= config.LOGIN_MAX_ATTEMPTS ||
    row.ip_attempts >= config.LOGIN_MAX_IP_ATTEMPTS
  ) {
    const seconds = retryAfterSeconds(
      row.last_attempt,
      config.LOGIN_WINDOW_MINUTES,
    )
    throw new AppError(
      429,
      'account_locked',
      'Demasiados intentos. Intenta de nuevo más tarde.',
      {
        details: { retryAfterSeconds: seconds },
        headers: { 'Retry-After': String(seconds) },
      },
    )
  }
}

export async function recordLoginAttempt(
  db: Database,
  attempt: Attempt,
): Promise<void> {
  await db.execute(sql`
    insert into public.login_attempts (username, user_id, ip, successful)
    values (
      ${attempt.username},
      ${attempt.userId ?? null},
      ${attempt.ip ?? null},
      ${attempt.successful}
    )
  `)
}
