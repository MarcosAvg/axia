import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { ADMIN_LOCK_KEY, assertRoleChange } from './admin-shared.js'
import { can, type Actor } from './authorization.js'

function notFound(label: string): never {
  throw new AppError(404, 'not_found', `${label} no encontrado`)
}

function forbiddenRoles(): never {
  throw new AppError(403, 'forbidden', 'No tienes permiso para asignar roles')
}

function protectedAdminRole(): never {
  throw new AppError(
    409,
    'admin_role_protected',
    'El rol Administrador no se puede desactivar ni editar',
  )
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
  const current = await db.execute(sql`
    select name from public.roles where id = ${id}
  `)
  const role = current.rows[0] as { name: string } | undefined
  if (!role) notFound('Rol')
  if (role.name === 'administrator' && input.active === false) {
    protectedAdminRole()
  }

  await db.execute(sql`
    update public.roles set
      label = coalesce(${input.label ?? null}, label),
      active = coalesce(${input.active ?? null}, active)
    where id = ${id}
  `)
}

async function assertNotAdminRole(db: Database, roleId: string) {
  const result = await db.execute(sql`
    select name from public.roles where id = ${roleId}
  `)
  const role = result.rows[0] as { name: string } | undefined
  if (role?.name === 'administrator') protectedAdminRole()
}

export async function setRolePermission(
  db: Database,
  roleId: string,
  permissionId: string,
  scope: string,
) {
  await assertNotAdminRole(db, roleId)
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
  await assertNotAdminRole(db, roleId)
  await db.execute(sql`
    delete from public.role_permissions
    where role_id = ${roleId} and permission_id = ${permissionId}
  `)
}

export async function assignUserRole(
  db: Database,
  actor: Actor,
  userId: string,
  roleId: string,
) {
  if (!can(actor, 'role.manage')) forbiddenRoles()

  const user = await db.execute(sql`
    select id from public.users where id = ${userId} limit 1
  `)
  if (!user.rows[0]) notFound('Usuario')

  const role = await db.execute(sql`
    select id from public.roles where id = ${roleId} and active limit 1
  `)
  if (!role.rows[0]) {
    throw new AppError(400, 'validation_error', 'Rol no válido')
  }

  await db.execute(sql`
    insert into public.user_roles (user_id, role_id) values (${userId}, ${roleId})
    on conflict do nothing
  `)
}

export async function removeUserRole(
  db: Database,
  actor: Actor,
  userId: string,
  roleId: string,
) {
  if (!can(actor, 'role.manage')) forbiddenRoles()

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${ADMIN_LOCK_KEY})`)

    const targetResult = await tx.execute(sql`
      select id, active from public.users where id = ${userId} for update
    `)
    const target = targetResult.rows[0] as
      { id: string; active: boolean } | undefined
    if (!target) notFound('Usuario')

    const rolesResult = await tx.execute(sql`
      select role_id from public.user_roles where user_id = ${userId}
    `)
    const roleIds = (rolesResult.rows as Array<{ role_id: string }>).map(
      (row) => row.role_id,
    )
    const remaining = roleIds.filter((id) => id !== roleId)

    const adminRole = await tx.execute(sql`
      select id from public.roles where name = 'administrator' limit 1
    `)
    const adminRoleId = (adminRole.rows[0] as { id: string } | undefined)?.id
    if (adminRoleId && roleIds.includes(adminRoleId)) {
      await assertRoleChange(tx, actor, target, remaining)
    }

    await tx.execute(sql`
      delete from public.user_roles
      where user_id = ${userId} and role_id = ${roleId}
    `)
  })
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
