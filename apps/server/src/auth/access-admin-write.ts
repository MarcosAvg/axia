import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'

function notFound(label: string): never {
  throw new AppError(404, 'not_found', `${label} no encontrado`)
}

export async function createRole(
  db: Database,
  input: { name: string; label: string },
) {
  await db.execute(sql`
    insert into public.roles (name, label) values (${input.name}, ${input.label})
  `)
}

export async function updateRole(
  db: Database,
  id: string,
  input: { label?: string; active?: boolean },
) {
  const result = await db.execute(sql`
    update public.roles set
      label = coalesce(${input.label ?? null}, label),
      active = coalesce(${input.active ?? null}, active)
    where id = ${id}
    returning id
  `)
  if (!result.rows[0]) notFound('Rol')
}

export async function setRolePermission(
  db: Database,
  roleId: string,
  permissionId: string,
  scope: string,
) {
  await db.execute(sql`
    insert into public.role_permissions (role_id, permission_id, scope)
    values (${roleId}, ${permissionId}, ${scope}::public.permission_scope)
    on conflict (role_id, permission_id)
    do update set scope = excluded.scope
  `)
}

export async function removeRolePermission(
  db: Database,
  roleId: string,
  permissionId: string,
) {
  await db.execute(sql`
    delete from public.role_permissions
    where role_id = ${roleId} and permission_id = ${permissionId}
  `)
}

export async function setProfileActive(
  db: Database,
  id: string,
  active: boolean,
) {
  const result = await db.execute(sql`
    update public.users set active = ${active} where id = ${id} returning id
  `)
  if (!result.rows[0]) notFound('Usuario')
}

export async function assignUserRole(
  db: Database,
  userId: string,
  roleId: string,
) {
  await db.execute(sql`
    insert into public.user_roles (user_id, role_id) values (${userId}, ${roleId})
    on conflict do nothing
  `)
}

export async function removeUserRole(
  db: Database,
  userId: string,
  roleId: string,
) {
  await db.execute(sql`
    delete from public.user_roles where user_id = ${userId} and role_id = ${roleId}
  `)
}

export async function linkRequesterUser(
  db: Database,
  requesterId: string,
  userId: string | null,
) {
  const result = await db.execute(sql`
    update public.requesters set user_id = ${userId} where id = ${requesterId}
    returning id
  `)
  if (!result.rows[0]) notFound('Solicitante')
}

export async function linkTechnicianUser(
  db: Database,
  technicianId: string,
  userId: string | null,
) {
  const result = await db.execute(sql`
    update public.technicians set user_id = ${userId} where id = ${technicianId}
    returning id
  `)
  if (!result.rows[0]) notFound('Técnico')
}

export async function createScope(
  db: Database,
  userId: string,
  teamId: string,
) {
  await db.execute(sql`
    insert into public.supervisor_scopes (user_id, team_id)
    values (${userId}, ${teamId})
    on conflict (user_id, team_id) do update set active = true
  `)
}

export async function deleteScope(db: Database, id: string) {
  await db.execute(sql`delete from public.supervisor_scopes where id = ${id}`)
}

export async function addScopeBuilding(
  db: Database,
  scopeId: string,
  buildingId: string,
) {
  await db.execute(sql`
    insert into public.supervisor_scope_buildings (scope_id, building_id)
    values (${scopeId}, ${buildingId}) on conflict do nothing
  `)
}

export async function removeScopeBuilding(
  db: Database,
  scopeId: string,
  buildingId: string,
) {
  await db.execute(sql`
    delete from public.supervisor_scope_buildings
    where scope_id = ${scopeId} and building_id = ${buildingId}
  `)
}

export async function addTechnicianCategory(
  db: Database,
  technicianId: string,
  categoryId: string,
) {
  await db.execute(sql`
    insert into public.technician_categories (technician_id, category_id)
    values (${technicianId}, ${categoryId}) on conflict do nothing
  `)
}

export async function removeTechnicianCategory(
  db: Database,
  technicianId: string,
  categoryId: string,
) {
  await db.execute(sql`
    delete from public.technician_categories
    where technician_id = ${technicianId} and category_id = ${categoryId}
  `)
}
