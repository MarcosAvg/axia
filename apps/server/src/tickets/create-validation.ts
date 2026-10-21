import { sql } from 'drizzle-orm'

import { AppError } from '../http/errors.js'
import type { CreateTicketInput } from './create-types.js'
import type { DbExecutor } from './db.js'

type ActiveTable =
  'buildings' | 'dependencies' | 'service_types' | 'priorities' | 'channels'

export type RequesterRow = {
  id: string
  full_name: string
  contact: string | null
  user_id: string | null
}

export type CategoryRow = {
  id: string
  team_id: string
}

type LocationRow = {
  id: string
  building_id: string
}

type ChildRow = {
  id: string
  parent_id: string
}

function invalid(message: string): AppError {
  return new AppError(400, 'validation_error', message)
}

async function requireActive(
  tx: DbExecutor,
  table: ActiveTable,
  id: string,
  label: string,
) {
  const result = await tx.execute(sql`
    select id from ${sql.raw(`public.${table}`)}
    where id = ${id} and active
    limit 1
  `)
  if (!result.rows[0]) throw invalid(`${label} no válido`)
}

export async function loadRequester(
  tx: DbExecutor,
  requesterId: string,
): Promise<RequesterRow> {
  const result = await tx.execute(sql`
    select id, full_name, contact, user_id
    from public.requesters
    where id = ${requesterId} and active
    limit 1
  `)
  const row = result.rows[0] as RequesterRow | undefined
  if (!row) throw invalid('Solicitante no válido')
  return row
}

async function loadCategory(
  tx: DbExecutor,
  categoryId: string,
): Promise<CategoryRow> {
  const result = await tx.execute(sql`
    select id, team_id
    from public.categories
    where id = ${categoryId} and active
    limit 1
  `)
  const row = result.rows[0] as CategoryRow | undefined
  if (!row) throw invalid('Categoría no válida')
  return row
}

async function validateLocation(
  tx: DbExecutor,
  locationId: string,
  buildingId: string,
) {
  const result = await tx.execute(sql`
    select id, building_id
    from public.locations
    where id = ${locationId} and active
    limit 1
  `)
  const row = result.rows[0] as LocationRow | undefined
  if (!row) throw invalid('Ubicación no válida')
  if (row.building_id !== buildingId) {
    throw invalid('La ubicación no pertenece al edificio')
  }
}

async function validateSubcategory(
  tx: DbExecutor,
  categoryId: string,
  subcategoryId: string,
) {
  const result = await tx.execute(sql`
    select id, category_id as parent_id
    from public.subcategories
    where id = ${subcategoryId} and active
    limit 1
  `)
  const row = result.rows[0] as ChildRow | undefined
  if (!row || row.parent_id !== categoryId) {
    throw invalid('La subcategoría no pertenece a la categoría')
  }
}

async function validateProblem(
  tx: DbExecutor,
  subcategoryId: string,
  problemId: string,
) {
  const result = await tx.execute(sql`
    select id, subcategory_id as parent_id
    from public.problems
    where id = ${problemId} and active
    limit 1
  `)
  const row = result.rows[0] as ChildRow | undefined
  if (!row || row.parent_id !== subcategoryId) {
    throw invalid('El problema no pertenece a la subcategoría')
  }
}

export type ResolvedCreateInput = CreateTicketInput & {
  serviceTypeId: string
  priorityId: string
  channelId: string
}

export async function validateCreateInputs(
  tx: DbExecutor,
  input: ResolvedCreateInput,
): Promise<CategoryRow> {
  await requireActive(tx, 'buildings', input.buildingId, 'Edificio')
  await requireActive(tx, 'dependencies', input.dependencyId, 'Dependencia')
  await requireActive(
    tx,
    'service_types',
    input.serviceTypeId,
    'Tipo de servicio',
  )
  await requireActive(tx, 'priorities', input.priorityId, 'Prioridad')
  await requireActive(tx, 'channels', input.channelId, 'Canal')
  const category = await loadCategory(tx, input.categoryId)
  await validateLocation(tx, input.locationId, input.buildingId)
  if (input.subcategoryId) {
    await validateSubcategory(tx, input.categoryId, input.subcategoryId)
  }
  if (input.problemId) {
    if (!input.subcategoryId) {
      throw invalid('No se puede indicar un problema sin subcategoría')
    }
    await validateProblem(tx, input.subcategoryId, input.problemId)
  }
  return category
}

type DefaultRow = { id: string }

async function firstActive(
  tx: DbExecutor,
  table: ActiveTable,
  preferredName?: string,
): Promise<string | null> {
  const result = await tx.execute(sql`
    select id from ${sql.raw(`public.${table}`)}
    where active
    order by (name = ${preferredName ?? ''}) desc, name
    limit 1
  `)
  return (result.rows[0] as DefaultRow | undefined)?.id ?? null
}

async function resolvePriorityId(
  tx: DbExecutor,
  input: CreateTicketInput,
): Promise<string | undefined> {
  if (input.priorityId) return input.priorityId
  if (input.problemId) {
    const problemDefault = await tx.execute(sql`
      select default_priority_id as id from public.problems where id = ${input.problemId}
    `)
    const id = (problemDefault.rows[0] as DefaultRow | undefined)?.id
    if (id) return id
  }
  const instanceDefault = await tx.execute(sql`
    select default_priority_id as id from public.instance_settings limit 1
  `)
  return (
    (instanceDefault.rows[0] as DefaultRow | undefined)?.id ??
    (await firstActive(tx, 'priorities', 'Media')) ??
    undefined
  )
}

export async function resolveCreateDefaults(
  tx: DbExecutor,
  input: CreateTicketInput,
): Promise<ResolvedCreateInput> {
  const serviceTypeId =
    input.serviceTypeId ??
    (await firstActive(tx, 'service_types', 'Correctivo'))
  const channelId =
    input.channelId ?? (await firstActive(tx, 'channels', 'Web'))
  const priorityId = await resolvePriorityId(tx, input)
  if (!serviceTypeId || !priorityId || !channelId) {
    throw invalid('Faltan catálogos obligatorios para registrar el tiquet')
  }
  return { ...input, serviceTypeId, priorityId, channelId }
}
