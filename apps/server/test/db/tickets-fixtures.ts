import { Pool } from 'pg'

import type { Actor } from '../../src/auth/authorization.js'
import { loadActor } from '../../src/auth/authorization.js'
import type { Database } from '../../src/db/client.js'
import { createDb } from '../../src/db/client.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'
import { createCatalog } from './tickets-fixture-catalog.js'
import { createPeople } from './tickets-fixture-people.js'
import {
  createTicketActivity,
  createTickets,
  type TicketFixtureIds,
} from './tickets-fixture-tickets.js'

type TicketFixtureActors = {
  admin: Actor
  requester: Actor
  technician: Actor
  supervisor: Actor
  outsider: Actor
}

export type TicketFixtures = {
  db: Database
  pool: Pool
  actors: TicketFixtureActors
  ids: TicketFixtureIds
}

export async function buildTicketFixtures(): Promise<TicketFixtures> {
  await prepareTestDatabase()
  const created = createDb(ownerConnectionString())
  const catalog = await createCatalog(created.db)
  const people = await createPeople(created.db, catalog)
  const ids = await createTickets(created.db, catalog, people)
  await createTicketActivity(created.db, catalog, people, ids)

  const actorIds = {
    admin: people.adminId,
    requester: people.requesterUserId,
    technician: people.technicianUserId,
    supervisor: people.supervisorUserId,
    outsider: people.outsiderId,
  }
  const actors = {} as TicketFixtureActors
  for (const [key, userId] of Object.entries(actorIds)) {
    const actor = await loadActor(created.db, userId)
    if (!actor) throw new Error(`Actor ${key} could not be loaded`)
    actors[key as keyof TicketFixtureActors] = actor
  }
  if (await loadActor(created.db, people.inactiveId)) {
    throw new Error('Inactive actor should not load')
  }

  return { db: created.db, pool: created.pool, actors, ids }
}
