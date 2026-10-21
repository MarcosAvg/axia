import type { Client } from 'pg'

import { generateTemporaryPassword, hashPassword } from '../../auth/password.js'
import { buildDemoCatalogs } from './catalogs.js'
import { DEMO_TICKETS, MIN_PASSWORD_LENGTH } from './data.js'
import { buildDemoPeople, buildDemoScopes } from './people.js'
import { insertDemoTicket } from './tickets.js'

const DEMO_LOCK_KEY = 1_147_365_203 // "AXIA-DEMO"

export type DemoSeedOptions = {
  password?: string
  resetPasswords?: boolean
}

export type DemoSeedResult = {
  password: string
  passwordGenerated: boolean
  passwordApplied: boolean
  usersCreated: number
  ticketsCreated: number
  ticketsSkipped: number
}

async function ensureReference(client: Client) {
  const row = await client.query<{ count: number }>(
    `select count(*)::int as count
     from public.priorities p
     cross join public.service_types s
     cross join public.channels c
     cross join public.work_calendars w
     where p.name = 'Media' and s.name = 'Correctivo'
       and c.name = 'Web' and w.name = 'Operación'`,
  )
  if ((row.rows[0]?.count ?? 0) === 0) {
    throw new Error(
      'Reference catalogs are missing; run migrations before the demo seed',
    )
  }
}

export async function seedDemo(
  client: Client,
  options: DemoSeedOptions = {},
): Promise<DemoSeedResult> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The demo seed cannot run with NODE_ENV=production')
  }
  const password = options.password ?? generateTemporaryPassword()
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `The demo password must have at least ${MIN_PASSWORD_LENGTH} characters`,
    )
  }
  const passwordHash = await hashPassword(password)
  const resetPasswords = options.resetPasswords ?? false
  let usersCreated = 0
  let ticketsCreated = 0
  let ticketsSkipped = 0

  await client.query('begin')
  try {
    await client.query('select pg_advisory_xact_lock($1)', [DEMO_LOCK_KEY])
    await ensureReference(client)
    const catalogs = await buildDemoCatalogs(client)
    const people = await buildDemoPeople(
      client,
      catalogs,
      passwordHash,
      resetPasswords,
    )
    await buildDemoScopes(client, catalogs, people.supervisorId)
    usersCreated = [...people.users.values()].filter(
      (user) => user.created,
    ).length

    for (const ticket of DEMO_TICKETS) {
      if (await insertDemoTicket(client, ticket, catalogs, people)) {
        ticketsCreated += 1
      } else {
        ticketsSkipped += 1
      }
    }
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  }

  return {
    password,
    passwordGenerated: options.password === undefined,
    passwordApplied: usersCreated > 0 || resetPasswords,
    usersCreated,
    ticketsCreated,
    ticketsSkipped,
  }
}
