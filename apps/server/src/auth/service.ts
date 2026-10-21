import { sql } from 'drizzle-orm'

import type { AppConfig } from '../config.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { createAdminService } from './admin.js'
import type { Actor } from './authorization.js'
import { loadActor } from './authorization.js'
import { assertNotLocked, recordLoginAttempt } from './lockout.js'
import {
  hashPassword,
  verifyPassword,
  verifyPasswordOrDummy,
} from './password.js'
import {
  createSession,
  loadSession,
  revokeSession,
  revokeUserSessions,
  type SessionContext,
} from './sessions.js'

const SETUP_LOCK_KEY = 1_147_365_202 // "AXIA-SETUP"

export type SetupInput = {
  username: string
  fullName: string
  password: string
}

export type LoginInput = {
  username: string
  password: string
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

type LoginUserRow = {
  id: string
  username: string
  full_name: string
  password_hash: string
  must_change_password: boolean
  active: boolean
}

export type AuthResult = {
  actor: Actor
  token: string
}

async function setupStatus(db: Database) {
  const result = await db.execute(sql`
    select count(*)::int as count from public.users
  `)
  const row = result.rows[0] as { count: number } | undefined
  return { required: !row || row.count === 0 }
}

async function setup(
  db: Database,
  config: AppConfig,
  input: SetupInput,
  context: SessionContext,
): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password)

  const userId = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${SETUP_LOCK_KEY})`)
    const count = await tx.execute(sql`
      select count(*)::int as count from public.users
    `)
    const countRow = count.rows[0] as { count: number } | undefined
    if (!countRow || countRow.count > 0) {
      throw new AppError(
        409,
        'setup_complete',
        'La instancia ya tiene usuarios',
      )
    }

    const role = await tx.execute(sql`
      select id from public.roles
      where name = 'administrator' and active
      limit 1
    `)
    const adminRole = role.rows[0] as { id: string } | undefined
    if (!adminRole) throw new Error('The administrator role is missing')

    const created = await tx.execute(sql`
      insert into public.users (
        username, full_name, password_hash, must_change_password
      )
      values (${input.username}, ${input.fullName}, ${passwordHash}, false)
      returning id
    `)
    const user = created.rows[0] as { id: string } | undefined
    if (!user) throw new Error('The first administrator could not be created')

    await tx.execute(sql`
      insert into public.user_roles (user_id, role_id)
      values (${user.id}, ${adminRole.id})
    `)
    return user.id
  })

  const actor = await loadActor(db, userId)
  if (!actor) throw new Error('The first administrator could not be loaded')
  const session = await createSession(db, userId, config, context)
  return { actor, token: session.token }
}

async function login(
  db: Database,
  config: AppConfig,
  input: LoginInput,
  context: SessionContext,
): Promise<AuthResult> {
  await assertNotLocked(db, config, input.username, context.ip)

  const result = await db.execute(sql`
    select id, username, full_name, password_hash, must_change_password, active
    from public.users
    where username = ${input.username}
    limit 1
  `)
  const user = result.rows[0] as LoginUserRow | undefined
  const valid = await verifyPasswordOrDummy(
    user?.password_hash ?? null,
    input.password,
  )

  if (!user || !user.active || !valid) {
    await recordLoginAttempt(db, {
      username: input.username,
      userId: user?.id,
      ip: context.ip,
      successful: false,
    })
    throw new AppError(
      401,
      'invalid_credentials',
      'Usuario o contraseña incorrectos',
    )
  }

  await recordLoginAttempt(db, {
    username: input.username,
    userId: user.id,
    ip: context.ip,
    successful: true,
  })
  await db.execute(sql`
    update public.users set last_login_at = now() where id = ${user.id}
  `)

  const actor = await loadActor(db, user.id)
  if (!actor) {
    throw new AppError(401, 'invalid_credentials', 'Usuario no disponible')
  }
  const session = await createSession(db, user.id, config, context)
  return { actor, token: session.token }
}

async function logout(db: Database, sessionId: string): Promise<void> {
  await revokeSession(db, sessionId)
}

type ChangePasswordParams = {
  actor: Actor
  input: ChangePasswordInput
  context: SessionContext
}

async function changePassword(
  db: Database,
  config: AppConfig,
  { actor, input, context }: ChangePasswordParams,
): Promise<AuthResult> {
  const result = await db.execute(sql`
    select password_hash from public.users where id = ${actor.id} limit 1
  `)
  const row = result.rows[0] as { password_hash: string } | undefined
  if (
    !row ||
    !(await verifyPassword(row.password_hash, input.currentPassword))
  ) {
    throw new AppError(
      400,
      'invalid_password',
      'La contraseña actual no es correcta',
    )
  }

  const passwordHash = await hashPassword(input.newPassword)
  await db.execute(sql`
    update public.users
    set password_hash = ${passwordHash},
        must_change_password = false,
        password_changed_at = now()
    where id = ${actor.id}
  `)
  await revokeUserSessions(db, actor.id)
  const session = await createSession(db, actor.id, config, context)
  const refreshed = await loadActor(db, actor.id)
  if (!refreshed) throw new Error('The user could not be reloaded')
  return { actor: refreshed, token: session.token }
}

async function authenticate(
  db: Database,
  config: AppConfig,
  token: string,
): Promise<{ actor: Actor; sessionId: string } | null> {
  const session = await loadSession(db, token, config)
  if (!session) return null
  const actor = await loadActor(db, session.userId)
  if (!actor) return null
  return { actor, sessionId: session.id }
}

export function createAuthService(db: Database, config: AppConfig) {
  const admin = createAdminService(db)

  return {
    setupStatus: () => setupStatus(db),
    setup: (input: SetupInput, context: SessionContext) =>
      setup(db, config, input, context),
    login: (input: LoginInput, context: SessionContext) =>
      login(db, config, input, context),
    logout: (sessionId: string) => logout(db, sessionId),
    changePassword: (
      actor: Actor,
      input: ChangePasswordInput,
      context: SessionContext,
    ) => changePassword(db, config, { actor, input, context }),
    authenticate: (token: string) => authenticate(db, config, token),
    ...admin,
  }
}

export type AuthService = ReturnType<typeof createAuthService>
