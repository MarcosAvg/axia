import type { Client } from 'pg'

import { generateTemporaryPassword, hashPassword } from '../../auth/password.js'
import { buildDemoCatalogs } from './catalogs.js'
import { DEMO_TICKETS, MIN_PASSWORD_LENGTH } from './data.js'
import { buildGeneratedTickets } from './generate.js'
import { buildDemoPeople, buildDemoScopes } from './people.js'
import { removeDemoFiles, type DemoEvidenceStorage } from './evidence.js'
import { loadDemoReasons } from './reasons.js'
import { insertDemoTicket } from './tickets.js'

const DEMO_LOCK_KEY = 1_147_365_203 // "AXIA-DEMO"

export type DemoSeedOptions = {
  password?: string
  resetPasswords?: boolean
  evidenceDir?: string
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

async function seedTickets(input: {
  client: Client
  catalogs: Awaited<ReturnType<typeof buildDemoCatalogs>>
  people: Awaited<ReturnType<typeof buildDemoPeople>>
  reasons: Awaited<ReturnType<typeof loadDemoReasons>>
  storage: DemoEvidenceStorage
}) {
  let created = 0
  let skipped = 0
  for (const ticket of [...DEMO_TICKETS, ...buildGeneratedTickets()]) {
    if (await insertDemoTicket({ ...input, ticket })) {
      created += 1
    } else {
      skipped += 1
    }
  }
  return { created, skipped }
}

function demoPassword(options: DemoSeedOptions) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The demo seed cannot run with NODE_ENV=production')
  }
  const password = options.password ?? generateTemporaryPassword()
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `The demo password must have at least ${MIN_PASSWORD_LENGTH} characters`,
    )
  }
  return password
}

export async function seedDemo(
  client: Client,
  options: DemoSeedOptions = {},
): Promise<DemoSeedResult> {
  const password = demoPassword(options)
  const passwordHash = await hashPassword(password)
  const resetPasswords = options.resetPasswords ?? false
  const storage: DemoEvidenceStorage = {
    directory: options.evidenceDir ?? './data/evidence',
    createdFiles: [],
  }
  const counts = { usersCreated: 0, ticketsCreated: 0, ticketsSkipped: 0 }

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
    const reasons = await loadDemoReasons(client)
    counts.usersCreated = [...people.users.values()].filter(
      (user) => user.created,
    ).length
    const tickets = await seedTickets({
      client,
      catalogs,
      people,
      reasons,
      storage,
    })
    counts.ticketsCreated = tickets.created
    counts.ticketsSkipped = tickets.skipped
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    await removeDemoFiles(storage)
    throw error
  }

  return {
    password,
    passwordGenerated: options.password === undefined,
    passwordApplied: counts.usersCreated > 0 || resetPasswords,
    ...counts,
  }
}
