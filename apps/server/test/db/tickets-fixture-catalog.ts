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
  subcategoryA: Id
  subcategoryB: Id
  problemA: Id
  problemB: Id
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

async function createClassification(
  db: Database,
  context: {
    categoryA: Id
    categoryB: Id
    teamA: Id
    teamB: Id
  },
) {
  const { categoryA, categoryB, teamA, teamB } = context
  const subcategoryA = await insertOne(
    db,
    sql`insert into public.subcategories (category_id, name)
        values (${categoryA.id}, 'Subcategoría A') returning id`,
  )
  const subcategoryB = await insertOne(
    db,
    sql`insert into public.subcategories (category_id, name)
        values (${categoryB.id}, 'Subcategoría B') returning id`,
  )
  return {
    subcategoryA,
    subcategoryB,
    problemA: await insertOne(
      db,
      sql`insert into public.problems (subcategory_id, team_id, name)
          values (${subcategoryA.id}, ${teamA.id}, 'Problema A') returning id`,
    ),
    problemB: await insertOne(
      db,
      sql`insert into public.problems (subcategory_id, team_id, name)
          values (${subcategoryB.id}, ${teamB.id}, 'Problema B') returning id`,
    ),
  }
}

export async function createCatalog(db: Database): Promise<Catalog> {
  const places = await createPlaces(db)
  const dependency = await insertOne(
    db,
    sql`insert into public.dependencies (name) values ('Dependencia') returning id`,
  )
  await db.execute(sql`
    insert into public.dependency_locations (dependency_id, location_id)
    values
      (${dependency.id}, ${places.locationA1.id}),
      (${dependency.id}, ${places.locationA2.id}),
      (${dependency.id}, ${places.locationB1.id})
  `)
  const categoryA = await insertOne(
    db,
    sql`insert into public.categories (name) values ('Categoría A') returning id`,
  )
  const categoryB = await insertOne(
    db,
    sql`insert into public.categories (name) values ('Categoría B') returning id`,
  )
  const classification = await createClassification(db, {
    categoryA,
    categoryB,
    teamA: places.teamA,
    teamB: places.teamB,
  })
  const serviceType = await insertOne(
    db,
    sql`select id from public.service_types where name = 'Correctivo'`,
  )
  const priority = await insertOne(
    db,
    sql`select id from public.priorities where name = 'Media'`,
  )
  const channel = await insertOne(
    db,
    sql`select id from public.channels where name = 'Teléfono'`,
  )
  return {
    ...places,
    dependency,
    categoryA,
    categoryB,
    ...classification,
    serviceType,
    priority,
    channel,
  }
}
