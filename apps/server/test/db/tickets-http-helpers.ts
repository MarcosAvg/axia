import { sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'

import { buildApp } from '../../src/app.js'
import { createAuthService } from '../../src/auth/service.js'
import { createCatalogService } from '../../src/catalogs/service.js'
import { hashPassword } from '../../src/auth/password.js'
import type { Database } from '../../src/db/client.js'
import { createDb } from '../../src/db/client.js'
import { checkDatabase } from '../../src/db/health.js'
import { createTicketService } from '../../src/tickets/service.js'
import { cookieFrom, headers, login } from '../db/auth-helpers.js'
import { ownerConnectionString, prepareTestDatabase } from '../db/helpers.js'
import { createCatalog, insertOne } from '../db/tickets-fixture-catalog.js'
import { createPeople } from '../db/tickets-fixture-people.js'
import {
  createTicketActivity,
  createTickets,
  type TicketFixtureIds,
} from '../db/tickets-fixture-tickets.js'
import { testConfig } from '../http/helpers.js'

const PASSWORD = 'TicketPassword123!'

type TicketHttpCookies = {
  admin: string
  requester: string
  technician: string
  supervisor: string
  outsider: string
  noAccess: string
}

export type TicketHttpContext = {
  app: FastifyInstance
  db: Database
  pool: Pool
  ids: TicketFixtureIds
  cookies: TicketHttpCookies
}

async function loginCookie(app: FastifyInstance, username: string) {
  const response = await login(app, username, PASSWORD)
  if (response.statusCode !== 200) {
    throw new Error(
      `Login failed for ${username}: ${response.statusCode} ${response.body}`,
    )
  }
  return cookieFrom(response)
}

export async function buildTicketHttpApp(): Promise<TicketHttpContext> {
  await prepareTestDatabase()
  const created = createDb(ownerConnectionString())
  const catalog = await createCatalog(created.db)
  const people = await createPeople(created.db, catalog)
  const ids = await createTickets(created.db, catalog, people)
  await createTicketActivity(created.db, catalog, people, ids)

  const passwordHash = await hashPassword(PASSWORD)
  await insertOne(
    created.db,
    sql`insert into public.users (
      username, full_name, password_hash, must_change_password
    ) values ('no-access', 'Sin acceso', ${passwordHash}, false)
    returning id`,
  )
  const otherSupervisor = await insertOne(
    created.db,
    sql`insert into public.users (
      username, full_name, password_hash, must_change_password
    ) values ('other-supervisor', 'Otro supervisor', ${passwordHash}, false)
    returning id`,
  )
  await created.db.execute(sql`
    insert into public.user_roles (user_id, role_id)
    select ${otherSupervisor.id}, id from public.roles where name = 'supervisor'
  `)
  await created.db.execute(sql`
    insert into public.supervisor_scopes (user_id, team_id)
    select ${otherSupervisor.id}, id from public.teams where name = 'Equipo B'
  `)
  await created.db.execute(sql`
    update public.users
    set password_hash = ${passwordHash}, must_change_password = false
  `)

  const auth = createAuthService(created.db, testConfig)
  const tickets = createTicketService(created.db)
  const catalogs = createCatalogService(created.db)
  const app = await buildApp({
    config: testConfig,
    auth,
    tickets,
    catalogs,
    readiness: () => checkDatabase(created.pool),
    logger: false,
  })

  const cookies: TicketHttpCookies = {
    admin: await loginCookie(app, 'admin-access'),
    requester: await loginCookie(app, 'requester-access'),
    technician: await loginCookie(app, 'technician-access'),
    supervisor: await loginCookie(app, 'supervisor-access'),
    outsider: await loginCookie(app, 'outsider-access'),
    noAccess: await loginCookie(app, 'no-access'),
  }

  return { app, db: created.db, pool: created.pool, ids, cookies }
}

export async function closeTicketHttpApp(context: TicketHttpContext) {
  await context.app.close()
  await context.pool.end()
}

export function authHeaders(cookie?: string) {
  return headers(cookie)
}
