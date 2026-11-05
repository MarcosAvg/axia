import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import type { AdminCatalogTable } from './admin.js'
import { READ_COLUMNS } from './admin-row-columns.js'
import { SELECTS } from './admin-row-queries.js'

const DEFAULT_ORDER: Record<AdminCatalogTable, string> = {
  teams: 'name',
  buildings: 'name',
  locations: 'name',
  dependencies: 'name',
  categories: 'name',
  subcategories: 'name',
  problems: 'name',
  service_types: 'name',
  priorities: 'position',
  channels: 'name',
  requesters: 'full_name',
  technicians: 'full_name',
  reasons: 'name',
  work_calendars: 'name',
}

const NATURAL_ORDER_COLUMNS = new Set([
  'name',
  'full_name',
  'contact',
  'building_names',
  'category_name',
  'category_names',
  'user_label',
  'path',
  'timezone',
  'use',
])

function assertOrderColumn(table: AdminCatalogTable, column: string) {
  if (!READ_COLUMNS[table].includes(column)) {
    throw new AppError(400, 'validation_error', `Columna no válida: ${column}`)
  }
}

function orderExpression(column: string) {
  return NATURAL_ORDER_COLUMNS.has(column)
    ? sql`public.natural_sort_key(${sql.identifier(column)}::text)`
    : sql`${sql.identifier(column)}`
}

/** Filas de un catálogo con sus datos derivados, ordenadas por la columna pedida. */
export async function listAdminRows(
  db: Database,
  table: AdminCatalogTable,
  orderBy?: string,
) {
  const column = orderBy ?? DEFAULT_ORDER[table]
  assertOrderColumn(table, column)
  const result = await db.execute(sql`
    select * from (${SELECTS[table]}) ordered
    order by ${orderExpression(column)}, id
  `)
  return result.rows
}
