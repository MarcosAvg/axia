import { sql, type SQL } from 'drizzle-orm'

import type { Database } from '../../src/db/client.js'

export type Id = { id: string }

export type Catalog = {
  teamA: Id
  teamB: Id
  buildingA1: Id
  buildingA2: Id
  buildingB1: Id
  locationA1: Id
  locationA2: Id
  locationB1: Id
  dependency: Id
  categoryA: Id
  categoryB: Id
  serviceType: Id
  priority: Id
  channel: Id
}

export async function insertOne(db: Database, query: SQL): Promise<Id> {
  const result = await db.execute(query)
  const row = result.rows[0] as Id | undefined
  if (!row) throw new Error('Fixture insert did not return an id')
  return row
}

async function createPlaces(db: Database) {
  const teamA = await insertOne(
    db,
    sql`insert into public.teams (name) values ('Equipo A') returning id`,
  )
  const teamB = await insertOne(
    db,
    sql`insert into public.teams (name) values ('Equipo B') returning id`,
  )
  const buildingA1 = await insertOne(
    db,
    sql`insert into public.buildings (name) values ('Edificio A1') returning id`,
  )
  const buildingA2 = await insertOne(
    db,
    sql`insert into public.buildings (name) values ('Edificio A2') returning id`,
  )
  const buildingB1 = await insertOne(
    db,
    sql`insert into public.buildings (name) values ('Edificio B1') returning id`,
  )
  const locationA1 = await insertOne(
    db,
    sql`insert into public.locations (building_id, name)
        values (${buildingA1.id}, 'Sala A1') returning id`,
  )
  const locationA2 = await insertOne(
    db,
    sql`insert into public.locations (building_id, name)
        values (${buildingA2.id}, 'Sala A2') returning id`,
  )
  const locationB1 = await insertOne(
    db,
    sql`insert into public.locations (building_id, name)
        values (${buildingB1.id}, 'Sala B1') returning id`,
  )
  return {
    teamA,
    teamB,
    buildingA1,
    buildingA2,
    buildingB1,
    locationA1,
    locationA2,
    locationB1,
  }
}

export async function createCatalog(db: Database): Promise<Catalog> {
  const places = await createPlaces(db)
  const dependency = await insertOne(
    db,
    sql`insert into public.dependencies (name) values ('Dependencia') returning id`,
  )
  const categoryA = await insertOne(
    db,
    sql`insert into public.categories (team_id, name)
        values (${places.teamA.id}, 'Categoría A') returning id`,
  )
  const categoryB = await insertOne(
    db,
    sql`insert into public.categories (team_id, name)
        values (${places.teamB.id}, 'Categoría B') returning id`,
  )
  const serviceType = await insertOne(
    db,
    sql`insert into public.service_types (name) values ('Correctivo') returning id`,
  )
  const priority = await insertOne(
    db,
    sql`insert into public.priorities (name, position) values ('Media', 2) returning id`,
  )
  const channel = await insertOne(
    db,
    sql`insert into public.channels (name) values ('Teléfono') returning id`,
  )
  return {
    ...places,
    dependency,
    categoryA,
    categoryB,
    serviceType,
    priority,
    channel,
  }
}
