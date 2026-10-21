import type { Client } from 'pg'

import { ID } from './data.js'

type IdRow = { id: string }

async function one(client: Client, sql: string, params: unknown[] = []) {
  const result = await client.query<IdRow>(sql, params)
  const row = result.rows[0]
  if (!row) throw new Error('The demo seed expected one row')
  return row.id
}

async function ensureTeam(
  client: Client,
  id: string,
  name: string,
  calendar: string,
) {
  const teamId = await one(
    client,
    `insert into public.teams (id, name) values ($1, $2)
     on conflict (name) do update set name = excluded.name
     returning id`,
    [id, name],
  )
  await client.query(
    `update public.teams
     set work_calendar_id = (
       select id from public.work_calendars where name = $2
     )
     where id = $1 and work_calendar_id is null`,
    [teamId, calendar],
  )
  return teamId
}

async function ensureNamed(
  client: Client,
  table: string,
  name: string,
  extraId?: string,
) {
  if (extraId) {
    return one(
      client,
      `insert into public.${table} (id, name) values ($1, $2)
       on conflict (name) do update set name = excluded.name
       returning id`,
      [extraId, name],
    )
  }
  return one(
    client,
    `insert into public.${table} (name) values ($1)
     on conflict (name) do update set name = excluded.name
     returning id`,
    [name],
  )
}

async function ensureLocation(
  client: Client,
  buildingId: string,
  name: string,
) {
  return one(
    client,
    `insert into public.locations (building_id, name) values ($1, $2)
     on conflict (building_id, name) do update set name = excluded.name
     returning id`,
    [buildingId, name],
  )
}

async function ensureCategory(client: Client, teamId: string, name: string) {
  return one(
    client,
    `insert into public.categories (team_id, name) values ($1, $2)
     on conflict (team_id, name) do update set name = excluded.name
     returning id`,
    [teamId, name],
  )
}

async function ensureSubcategory(
  client: Client,
  categoryId: string,
  name: string,
) {
  return one(
    client,
    `insert into public.subcategories (category_id, name) values ($1, $2)
     on conflict (category_id, name) do update set name = excluded.name
     returning id`,
    [categoryId, name],
  )
}

async function ensureProblem(
  client: Client,
  subcategoryId: string,
  name: string,
) {
  return one(
    client,
    `insert into public.problems (subcategory_id, name) values ($1, $2)
     on conflict (subcategory_id, name) do update set name = excluded.name
     returning id`,
    [subcategoryId, name],
  )
}

async function ensurePlaces(client: Client) {
  const maintenance = await ensureTeam(
    client,
    ID.teamMaintenance,
    'Mantenimiento',
    'Operación',
  )
  const security = await ensureTeam(
    client,
    ID.teamSecurity,
    'Seguridad',
    'Oficina',
  )
  const central = await ensureNamed(
    client,
    'buildings',
    'Edificio Central',
    ID.buildingCentral,
  )
  const north = await ensureNamed(
    client,
    'buildings',
    'Edificio Norte',
    ID.buildingNorth,
  )
  const systems = await ensureNamed(
    client,
    'dependencies',
    'Sistemas',
    ID.dependencySystems,
  )
  const hr = await ensureNamed(
    client,
    'dependencies',
    'Recursos Humanos',
    ID.dependencyHr,
  )
  return { maintenance, security, central, north, systems, hr }
}

async function ensureClassification(
  client: Client,
  maintenance: string,
  security: string,
) {
  const electrical = await ensureCategory(client, maintenance, 'Eléctrico')
  const plumbing = await ensureCategory(client, maintenance, 'Plomería')
  const climate = await ensureCategory(client, maintenance, 'Clima')
  const access = await ensureCategory(client, security, 'Accesos')

  const contact = await ensureSubcategory(client, electrical, 'Contacto')
  const lighting = await ensureSubcategory(client, electrical, 'Iluminación')
  const leak = await ensureSubcategory(client, plumbing, 'Fuga')
  const drainage = await ensureSubcategory(client, plumbing, 'Drenaje')
  const air = await ensureSubcategory(client, climate, 'Aire acondicionado')
  const doors = await ensureSubcategory(client, access, 'Puertas')

  return {
    electrical,
    plumbing,
    climate,
    access,
    contact,
    lighting,
    leak,
    drainage,
    air,
    doors,
    spark: await ensureProblem(client, contact, 'Chispa o corto'),
    lamp: await ensureProblem(client, lighting, 'Lámpara fundida'),
    drip: await ensureProblem(client, leak, 'Goteo'),
    clog: await ensureProblem(client, drainage, 'Taponamiento'),
    noCooling: await ensureProblem(client, air, 'No enfría'),
    noClose: await ensureProblem(client, doors, 'No cierra'),
  }
}

export type DemoCatalogs = Awaited<ReturnType<typeof buildDemoCatalogs>>

export async function buildDemoCatalogs(client: Client): Promise<{
  maintenance: string
  security: string
  central: string
  north: string
  systems: string
  hr: string
  locations: {
    centralGround: string
    centralFirst: string
    northGround: string
    northFirst: string
  }
  electrical: string
  plumbing: string
  climate: string
  access: string
  contact: string
  lighting: string
  leak: string
  drainage: string
  air: string
  doors: string
  spark: string
  lamp: string
  drip: string
  clog: string
  noCooling: string
  noClose: string
}> {
  const places = await ensurePlaces(client)
  const locations = {
    centralGround: await ensureLocation(client, places.central, 'Planta baja'),
    centralFirst: await ensureLocation(client, places.central, 'Piso 1'),
    northGround: await ensureLocation(client, places.north, 'Planta baja'),
    northFirst: await ensureLocation(client, places.north, 'Piso 1'),
  }
  const classification = await ensureClassification(
    client,
    places.maintenance,
    places.security,
  )
  return { ...places, locations, ...classification }
}
