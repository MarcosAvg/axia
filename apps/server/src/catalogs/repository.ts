import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import type { CatalogName, CatalogQuery } from './names.js'

type SimpleOption = { id: string; name: string }
type PriorityOption = SimpleOption & { position: number }
type LocationOption = SimpleOption & { buildingId: string }
type CategoryOption = SimpleOption
type SubcategoryOption = SimpleOption & { categoryId: string }
type ProblemOption = SimpleOption & { subcategoryId: string }
type RequesterOption = {
  id: string
  fullName: string
  contact: string | null
  dependencyId: string | null
  dependencyName: string | null
  userId: string | null
}
type TechnicianOption = {
  id: string
  fullName: string
  teamId: string
  categoryIds: string[]
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
    order by public.natural_sort_key(name)
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
    join public.dependency_locations dl on dl.dependency_id = d.id
    where d.active and dl.location_id = ${locationId}
    order by public.natural_sort_key(d.name)
  `)
  return result.rows as SimpleOption[]
}

async function listPriorities(db: Database): Promise<PriorityOption[]> {
  const result = await db.execute(sql`
    select id, name, position
    from public.priorities
    where active
    order by position, public.natural_sort_key(name)
  `)
  return result.rows as PriorityOption[]
}

async function listLocations(
  db: Database,
  buildingId: string,
  dependencyId?: string,
): Promise<LocationOption[]> {
  if (dependencyId) {
    const result = await db.execute(sql`
      select id, name, "buildingId"
      from (
        select distinct l.id, l.name, l.building_id as "buildingId"
        from public.locations l
        join public.dependency_locations dl on dl.location_id = l.id
        join public.dependencies d on d.id = dl.dependency_id and d.active
        where l.active
          and l.building_id = ${buildingId}
          and dl.dependency_id = ${dependencyId}
      ) filtered
      order by public.natural_sort_key(name)
    `)
    return result.rows as LocationOption[]
  }
  const result = await db.execute(sql`
    select id, name, building_id as "buildingId"
    from public.locations
    where active and building_id = ${buildingId}
    order by public.natural_sort_key(name)
  `)
  return result.rows as LocationOption[]
}

async function listBuildings(
  db: Database,
  dependencyId?: string,
): Promise<SimpleOption[]> {
  if (!dependencyId) return listOptions(db, 'buildings')
  const result = await db.execute(sql`
    select id, name
    from (
      select distinct b.id, b.name
      from public.buildings b
      join public.locations l on l.building_id = b.id and l.active
      join public.dependency_locations dl on dl.location_id = l.id
      join public.dependencies d on d.id = dl.dependency_id and d.active
      where b.active and dl.dependency_id = ${dependencyId}
    ) filtered
    order by public.natural_sort_key(name)
  `)
  return result.rows as SimpleOption[]
}

async function listCategories(db: Database): Promise<CategoryOption[]> {
  const result = await db.execute(sql`
    select id, name
    from public.categories
    where active
    order by public.natural_sort_key(name)
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
    order by public.natural_sort_key(name)
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
    order by public.natural_sort_key(name)
  `)
  return result.rows as ProblemOption[]
}

async function listRequesters(db: Database): Promise<RequesterOption[]> {
  const result = await db.execute(sql`
    select
      r.id,
      r.full_name as "fullName",
      r.contact,
      r.dependency_id as "dependencyId",
      d.name as "dependencyName",
      r.user_id as "userId"
    from public.requesters r
    left join public.dependencies d on d.id = r.dependency_id
    where r.active
    order by public.natural_sort_key(r.full_name)
  `)
  return result.rows as RequesterOption[]
}

async function listTechnicians(db: Database): Promise<TechnicianOption[]> {
  const result = await db.execute(sql`
    select
      t.id,
      t.full_name as "fullName",
      t.team_id as "teamId",
      coalesce(
        array_agg(tc.category_id) filter (where tc.category_id is not null),
        '{}'
      ) as "categoryIds"
    from public.technicians t
    left join public.technician_categories tc on tc.technician_id = t.id
    where t.active
    group by t.id, t.full_name, t.team_id
    order by public.natural_sort_key(t.full_name)
  `)
  return result.rows as TechnicianOption[]
}

async function listReasons(db: Database, use: string): Promise<ReasonOption[]> {
  const result = await db.execute(sql`
    select id, name, use, parent_id as "parentId"
    from public.reasons
    where active and use = ${use}
    order by position, public.natural_sort_key(name)
  `)
  return result.rows as ReasonOption[]
}

const SIMPLE_TABLES: Partial<Record<CatalogName, OptionTable>> = {
  teams: 'teams',
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
    return query.buildingId
      ? listLocations(db, query.buildingId, query.dependencyId)
      : []
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
  if (name === 'buildings') return listBuildings(db, query.dependencyId)
  if (name === 'dependencies') return listDependencies(db, query.locationId)
  const table = SIMPLE_TABLES[name]
  if (table) return listOptions(db, table)
  const named = await listNamedCatalog(db, name)
  if (named) return named
  return (await listScopedCatalog(db, name, query)) ?? []
}
