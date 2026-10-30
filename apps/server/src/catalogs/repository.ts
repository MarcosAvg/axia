import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import type { CatalogName, CatalogQuery } from './names.js'

type SimpleOption = { id: string; name: string }
type PriorityOption = SimpleOption & { position: number }
type LocationOption = SimpleOption & { buildingId: string }
type CategoryOption = SimpleOption & { teamId: string }
type SubcategoryOption = SimpleOption & { categoryId: string }
type ProblemOption = SimpleOption & { subcategoryId: string }
type RequesterOption = {
  id: string
  fullName: string
  contact: string | null
  dependencyId: string | null
  userId: string | null
}
type TechnicianOption = {
  id: string
  fullName: string
  teamId: string
}
type ReasonOption = {
  id: string
  name: string
  use: string
  parentId: string | null
}

type CatalogItem =
  | SimpleOption
  | PriorityOption
  | LocationOption
  | CategoryOption
  | SubcategoryOption
  | ProblemOption
  | RequesterOption
  | TechnicianOption
  | ReasonOption

type OptionTable =
  'teams' | 'buildings' | 'dependencies' | 'service_types' | 'channels'

async function listOptions(
  db: Database,
  table: OptionTable,
): Promise<SimpleOption[]> {
  const result = await db.execute(sql`
    select id, name
    from ${sql.raw(`public.${table}`)}
    where active
    order by name
  `)
  return result.rows as SimpleOption[]
}

async function listDependencies(
  db: Database,
  locationId?: string,
): Promise<SimpleOption[]> {
  if (!locationId) return listOptions(db, 'dependencies')
  const result = await db.execute(sql`
    select d.id, d.name
    from public.dependencies d
    where d.active
      and (
        not exists (
          select 1 from public.dependency_locations dl
          where dl.dependency_id = d.id
        )
        or exists (
          select 1 from public.dependency_locations dl
          where dl.dependency_id = d.id and dl.location_id = ${locationId}
        )
      )
    order by d.name
  `)
  return result.rows as SimpleOption[]
}

async function listPriorities(db: Database): Promise<PriorityOption[]> {
  const result = await db.execute(sql`
    select id, name, position
    from public.priorities
    where active
    order by position, name
  `)
  return result.rows as PriorityOption[]
}

async function listLocations(
  db: Database,
  buildingId: string,
): Promise<LocationOption[]> {
  const result = await db.execute(sql`
    select id, name, building_id as "buildingId"
    from public.locations
    where active and building_id = ${buildingId}
    order by name
  `)
  return result.rows as LocationOption[]
}

async function listCategories(db: Database): Promise<CategoryOption[]> {
  const result = await db.execute(sql`
    select id, name, team_id as "teamId"
    from public.categories
    where active
    order by name
  `)
  return result.rows as CategoryOption[]
}

async function listSubcategories(
  db: Database,
  categoryId: string,
): Promise<SubcategoryOption[]> {
  const result = await db.execute(sql`
    select id, name, category_id as "categoryId"
    from public.subcategories
    where active and category_id = ${categoryId}
    order by name
  `)
  return result.rows as SubcategoryOption[]
}

async function listProblems(
  db: Database,
  subcategoryId: string,
): Promise<ProblemOption[]> {
  const result = await db.execute(sql`
    select id, name, subcategory_id as "subcategoryId"
    from public.problems
    where active and subcategory_id = ${subcategoryId}
    order by name
  `)
  return result.rows as ProblemOption[]
}

async function listRequesters(db: Database): Promise<RequesterOption[]> {
  const result = await db.execute(sql`
    select
      id,
      full_name as "fullName",
      contact,
      dependency_id as "dependencyId",
      user_id as "userId"
    from public.requesters
    where active
    order by full_name
  `)
  return result.rows as RequesterOption[]
}

async function listTechnicians(db: Database): Promise<TechnicianOption[]> {
  const result = await db.execute(sql`
    select id, full_name as "fullName", team_id as "teamId"
    from public.technicians
    where active
    order by full_name
  `)
  return result.rows as TechnicianOption[]
}

async function listReasons(db: Database, use: string): Promise<ReasonOption[]> {
  const result = await db.execute(sql`
    select id, name, use, parent_id as "parentId"
    from public.reasons
    where active and use = ${use}
    order by position, name
  `)
  return result.rows as ReasonOption[]
}

const SIMPLE_TABLES: Partial<Record<CatalogName, OptionTable>> = {
  teams: 'teams',
  buildings: 'buildings',
  'service-types': 'service_types',
  channels: 'channels',
}

async function listNamedCatalog(
  db: Database,
  name: CatalogName,
): Promise<CatalogItem[] | null> {
  if (name === 'priorities') return listPriorities(db)
  if (name === 'categories') return listCategories(db)
  if (name === 'requesters') return listRequesters(db)
  if (name === 'technicians') return listTechnicians(db)
  return null
}

async function listScopedCatalog(
  db: Database,
  name: CatalogName,
  query: CatalogQuery,
): Promise<CatalogItem[] | null> {
  if (name === 'locations') {
    return query.buildingId ? listLocations(db, query.buildingId) : []
  }
  if (name === 'subcategories') {
    return query.categoryId ? listSubcategories(db, query.categoryId) : []
  }
  if (name === 'problems') {
    return query.subcategoryId ? listProblems(db, query.subcategoryId) : []
  }
  if (name === 'reasons') {
    return query.use ? listReasons(db, query.use) : []
  }
  return null
}

export async function listCatalog(
  db: Database,
  name: CatalogName,
  query: CatalogQuery,
): Promise<CatalogItem[]> {
  if (name === 'dependencies') return listDependencies(db, query.locationId)
  const table = SIMPLE_TABLES[name]
  if (table) return listOptions(db, table)
  const named = await listNamedCatalog(db, name)
  if (named) return named
  return (await listScopedCatalog(db, name, query)) ?? []
}
