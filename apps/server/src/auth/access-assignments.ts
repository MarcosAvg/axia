import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

async function replaceBuildings(
  tx: Transaction,
  id: string,
  buildingIds: string[],
) {
  const ids = sql`${sql.param(buildingIds)}::uuid[]`
  await tx.execute(sql`
    delete from public.supervisor_scope_buildings
    where scope_id = ${id} and not (building_id = any(${ids}))
  `)
  await tx.execute(sql`
    insert into public.supervisor_scope_buildings (scope_id, building_id)
    select ${id}, unnest(${ids}) on conflict do nothing
  `)
}

export async function createScope(
  db: Database,
  values: { userId: string; teamId: string; buildingIds?: string[] },
) {
  await db.transaction(async (tx) => {
    const result = await tx.execute<{ id: string }>(sql`
      insert into public.supervisor_scopes (user_id, team_id)
      values (${values.userId}, ${values.teamId})
      on conflict (user_id, team_id) do update set active = true
      returning id
    `)
    if (values.buildingIds) {
      const scope = result.rows[0]
      if (!scope)
        throw new Error('El alta del ámbito no devolvió su identificador')
      await replaceBuildings(tx, scope.id, values.buildingIds)
    }
  })
}

export async function setScopeBuildings(
  db: Database,
  id: string,
  buildingIds: string[],
) {
  await db.transaction(async (tx) => {
    const scope = await tx.execute(sql`
      select id from public.supervisor_scopes where id = ${id} for update
    `)
    if (!scope.rows[0])
      throw new AppError(404, 'not_found', 'Ámbito no encontrado')
    await replaceBuildings(tx, id, buildingIds)
  })
}

export async function setTechnicianCategories(
  db: Database,
  id: string,
  categoryIds: string[],
) {
  await db.transaction(async (tx) => {
    const technician = await tx.execute(sql`
      select id from public.technicians where id = ${id} for update
    `)
    if (!technician.rows[0])
      throw new AppError(404, 'not_found', 'Técnico no encontrado')
    const ids = sql`${sql.param(categoryIds)}::uuid[]`
    await tx.execute(sql`
      delete from public.technician_categories
      where technician_id = ${id} and not (category_id = any(${ids}))
    `)
    await tx.execute(sql`
      insert into public.technician_categories (technician_id, category_id)
      select ${id}, unnest(${ids}) on conflict do nothing
    `)
  })
}
