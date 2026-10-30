import { sql, type SQL } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'

export type AdminCatalogTable =
  | 'teams'
  | 'buildings'
  | 'locations'
  | 'dependencies'
  | 'categories'
  | 'subcategories'
  | 'problems'
  | 'service_types'
  | 'priorities'
  | 'channels'
  | 'requesters'
  | 'technicians'
  | 'reasons'
  | 'work_calendars'

const COLUMNS: Record<AdminCatalogTable, readonly string[]> = {
  teams: ['name', 'active', 'work_calendar_id'],
  buildings: ['name', 'active'],
  locations: ['building_id', 'name', 'active'],
  dependencies: ['name', 'active'],
  categories: ['name', 'active'],
  subcategories: ['category_id', 'name', 'active'],
  problems: [
    'subcategory_id',
    'name',
    'active',
    'default_priority_id',
    'team_id',
  ],
  service_types: ['name', 'active', 'target_minutes'],
  priorities: ['name', 'position', 'target_minutes', 'active'],
  channels: ['name', 'is_platform', 'active'],
  requesters: ['full_name', 'contact', 'dependency_id', 'user_id', 'active'],
  technicians: ['full_name', 'team_id', 'user_id', 'active'],
  reasons: [
    'use',
    'parent_id',
    'name',
    'position',
    'requires_note',
    'allows_estimated_date',
    'clock_class',
    'active',
  ],
  work_calendars: ['name', 'timezone', 'active'],
}

export function adminTable(value: string): AdminCatalogTable {
  if (!(value in COLUMNS)) {
    throw new AppError(404, 'not_found', 'Catálogo no encontrado')
  }
  return value as AdminCatalogTable
}

function columnList(table: AdminCatalogTable): readonly string[] {
  return COLUMNS[table]
}

function assertColumn(table: AdminCatalogTable, column: string) {
  if (!columnList(table).includes(column)) {
    throw new AppError(400, 'validation_error', `Columna no válida: ${column}`)
  }
}

export type AdminValues = Record<
  string,
  string | number | boolean | null | undefined
>

function valueList(table: AdminCatalogTable, values: AdminValues): SQL[] {
  const entries = Object.entries(values).filter(
    ([, value]) => value !== undefined,
  )
  if (entries.length === 0) {
    throw new AppError(400, 'validation_error', 'No hay valores para guardar')
  }
  return entries.map(([column, value]) => {
    assertColumn(table, column)
    return sql`${sql.identifier(column)} = ${value}`
  })
}

export async function listAdminRows(
  db: Database,
  table: AdminCatalogTable,
  orderBy = 'name',
) {
  assertColumn(table, orderBy)
  const result = await db.execute(sql`
    select * from ${sql.identifier(table)}
    order by ${sql.identifier(orderBy)}
  `)
  return result.rows
}

export async function insertAdminRow(
  db: Database,
  table: AdminCatalogTable,
  values: AdminValues,
) {
  const entries = Object.entries(values).filter(
    ([, value]) => value !== undefined,
  )
  if (entries.length === 0) {
    throw new AppError(400, 'validation_error', 'No hay valores para guardar')
  }
  const columns = entries.map(([column]) => {
    assertColumn(table, column)
    return sql.identifier(column)
  })
  const params = entries.map(([, value]) => sql`${value}`)
  const result = await db.execute(sql`
    insert into ${sql.identifier(table)} (${sql.join(columns, sql`, `)})
    values (${sql.join(params, sql`, `)})
    returning id
  `)
  return (result.rows[0] as { id: string } | undefined)?.id
}

export type DependencyLocationLink = {
  dependencyId: string
  dependencyName: string
  buildingId: string
  buildingName: string
  locationId: string
  locationName: string
}

export async function listDependencyLocations(
  db: Database,
): Promise<DependencyLocationLink[]> {
  const result = await db.execute(sql`
    select
      d.id as "dependencyId",
      d.name as "dependencyName",
      b.id as "buildingId",
      b.name as "buildingName",
      l.id as "locationId",
      l.name as "locationName"
    from public.dependencies d
    join public.dependency_locations dl on dl.dependency_id = d.id
    join public.locations l on l.id = dl.location_id
    join public.buildings b on b.id = l.building_id
    order by d.name, b.name, l.name
  `)
  return result.rows as DependencyLocationLink[]
}

export async function listDependencyLocationIds(
  db: Database,
  dependencyId: string,
): Promise<string[]> {
  const result = await db.execute(sql`
    select location_id
    from public.dependency_locations
    where dependency_id = ${dependencyId}
    order by location_id
  `)
  return result.rows.map((row) =>
    String((row as { location_id: string }).location_id),
  )
}

export async function saveDependency(
  db: Database,
  input: {
    id?: string
    name: string
    active: boolean
    locationIds: string[]
  },
): Promise<string> {
  const locationIds = [...new Set(input.locationIds)]
  if (locationIds.length === 0) {
    throw new AppError(
      400,
      'validation_error',
      'Marca al menos una ubicación para la dependencia',
    )
  }
  return db.transaction(async (tx) => {
    for (const locationId of locationIds) {
      const location = await tx.execute(sql`
        select id from public.locations where id = ${locationId}
      `)
      if (!location.rows[0]) {
        throw new AppError(400, 'validation_error', 'Ubicación no encontrada')
      }
    }
    let dependencyId = input.id
    if (dependencyId) {
      const updated = await tx.execute(sql`
        update public.dependencies
        set name = ${input.name}, active = ${input.active}
        where id = ${dependencyId}
        returning id
      `)
      if (!updated.rows[0]) {
        throw new AppError(404, 'not_found', 'Dependencia no encontrada')
      }
    } else {
      const inserted = await tx.execute(sql`
        insert into public.dependencies (name, active)
        values (${input.name}, ${input.active})
        returning id
      `)
      dependencyId = (inserted.rows[0] as { id: string } | undefined)?.id
      if (!dependencyId) throw new Error('No se pudo crear la dependencia')
    }
    await tx.execute(sql`
      delete from public.dependency_locations
      where dependency_id = ${dependencyId}
    `)
    for (const locationId of locationIds) {
      await tx.execute(sql`
        insert into public.dependency_locations (dependency_id, location_id)
        values (${dependencyId}, ${locationId})
      `)
    }
    return dependencyId
  })
}

export async function updateAdminRow(
  db: Database,
  table: AdminCatalogTable,
  id: string,
  values: AdminValues,
) {
  const assignments = valueList(table, values)
  const result = await db.execute(sql`
    update ${sql.identifier(table)}
    set ${sql.join(assignments, sql`, `)}
    where id = ${id}
    returning id
  `)
  if (!result.rows[0]) {
    throw new AppError(404, 'not_found', 'Registro no encontrado')
  }
}
