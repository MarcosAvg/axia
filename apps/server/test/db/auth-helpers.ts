import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { Pool } from 'pg'
import { expect } from 'vitest'

import { buildApp } from '../../src/app.js'
import { hashPassword } from '../../src/auth/password.js'
import { createAuthService } from '../../src/auth/service.js'
import type { Database } from '../../src/db/client.js'
import { createDb } from '../../src/db/client.js'
import { checkDatabase } from '../../src/db/health.js'
import { testConfig } from '../http/helpers.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

const ORIGIN = 'http://localhost:80'
export const ADMIN_PASSWORD = 'AdminPassword123!'

export type AuthTestContext = {
  app: FastifyInstance
  db: Database
  pool: Pool
}

export function headers(cookie?: string) {
  return {
    host: 'localhost:80',
    origin: ORIGIN,
    ...(cookie ? { cookie } : {}),
  }
}

export function cookieFrom(response: { headers: Record<string, unknown> }) {
  const raw = response.headers['set-cookie']
  const first = Array.isArray(raw) ? raw[0] : raw
  return typeof first === 'string' ? (first.split(';')[0] ?? '') : ''
}

export async function buildAuthTestApp(): Promise<AuthTestContext> {
  await prepareTestDatabase()
  const created = createDb(ownerConnectionString())
  const auth = createAuthService(created.db, testConfig)
  const app = await buildApp({
    config: testConfig,
    auth,
    db: created.db,
    readiness: () => checkDatabase(created.pool),
    logger: false,
  })
  return { app, db: created.db, pool: created.pool }
}

export async function closeAuthTestApp(context: AuthTestContext) {
  await context.app.close()
  await context.pool.end()
}

export async function setupAdmin(app: FastifyInstance) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/setup',
    headers: headers(),
    payload: {
      username: 'admin',
      fullName: 'Administrador',
      password: ADMIN_PASSWORD,
    },
  })
  expect(response.statusCode).toBe(201)
  return cookieFrom(response)
}

export async function login(
  app: FastifyInstance,
  username: string,
  password: string,
) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: headers(),
    payload: { username, password },
  })
}

export async function createUser(
  app: FastifyInstance,
  adminCookie: string,
  username: string,
  roleIds: string[],
) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/admin/users',
    headers: headers(adminCookie),
    payload: { username, fullName: `Persona ${username}`, roleIds },
  })
  expect(response.statusCode).toBe(201)
  return response.json() as {
    user: { id: string; username: string }
    temporaryPassword: string
  }
}

export async function roleIdByName(
  app: FastifyInstance,
  adminCookie: string,
  name: string,
) {
  const response = await app.inject({
    method: 'GET',
    url: '/api/admin/roles',
    headers: headers(adminCookie),
  })
  const body = response.json() as { items: Array<{ id: string; name: string }> }
  const role = body.items.find((item) => item.name === name)
  if (!role) throw new Error(`Role ${name} not found`)
  return role.id
}

export async function adminId(app: FastifyInstance, cookie: string) {
  const response = await app.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: headers(cookie),
  })
  return (response.json() as { user: { id: string } }).user.id
}

/** Administrador y un usuario con solo `user.manage` para probar los límites. */
export async function setupOps(context: AuthTestContext) {
  const adminCookie = await setupAdmin(context.app)
  const adminUserId = await adminId(context.app, adminCookie)

  await context.db.execute(sql`
    insert into public.roles (name, label) values ('ops', 'Operaciones')
  `)
  await context.db.execute(sql`
    insert into public.role_permissions (role_id, permission_id, scope)
    select r.id, 'user.manage', 'all'
    from public.roles r where r.name = 'ops'
  `)
  const opsRole = await roleIdByName(context.app, adminCookie, 'ops')
  const opsPassword = 'OpsPassword123!'
  const opsHash = await hashPassword(opsPassword)
  const opsUser = await context.db.execute(sql`
    insert into public.users (username, full_name, password_hash, must_change_password)
    values ('ops', 'Operaciones', ${opsHash}, false)
    returning id
  `)
  const opsId = (opsUser.rows[0] as { id: string }).id
  await context.db.execute(sql`
    insert into public.user_roles (user_id, role_id) values (${opsId}, ${opsRole})
  `)

  const opsLogin = await login(context.app, 'ops', opsPassword)
  expect(opsLogin.statusCode).toBe(200)
  const adminRole = await roleIdByName(
    context.app,
    adminCookie,
    'administrator',
  )

  return {
    adminCookie,
    adminUserId,
    adminRole,
    opsId,
    opsCookie: cookieFrom(opsLogin),
  }
}
