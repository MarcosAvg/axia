import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'

async function listAccessRows(db: Database) {
  const [
    roles,
    permissions,
    rolePermissions,
    profiles,
    userRoles,
    requesters,
    technicians,
    scopes,
    scopeBuildings,
    technicianCategories,
  ] = await Promise.all([
    db.execute(
      sql`select id, name, label, active from public.roles order by name`,
    ),
    db.execute(sql`select id, description from public.permissions order by id`),
    db.execute(
      sql`select role_id, permission_id, scope from public.role_permissions`,
    ),
    db.execute(
      sql`select id, full_name, phone, active from public.users order by full_name`,
    ),
    db.execute(sql`select user_id, role_id from public.user_roles`),
    db.execute(
      sql`select id, full_name, user_id from public.requesters order by full_name`,
    ),
    db.execute(
      sql`select id, full_name, user_id from public.technicians order by full_name`,
    ),
    db.execute(
      sql`select id, user_id, team_id, active from public.supervisor_scopes`,
    ),
    db.execute(
      sql`select scope_id, building_id from public.supervisor_scope_buildings`,
    ),
    db.execute(
      sql`select technician_id, category_id from public.technician_categories`,
    ),
  ])
  return {
    roles,
    permissions,
    rolePermissions,
    profiles,
    userRoles,
    requesters,
    technicians,
    scopes,
    scopeBuildings,
    technicianCategories,
  }
}

type AccessRows = Awaited<ReturnType<typeof listAccessRows>>

function mapPeople(rows: AccessRows) {
  return {
    profiles: (
      rows.profiles.rows as Array<{
        id: string
        full_name: string
        phone: string | null
        active: boolean
      }>
    ).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      active: row.active,
    })),
    userRoles: (
      rows.userRoles.rows as Array<{ user_id: string; role_id: string }>
    ).map((row) => ({ userId: row.user_id, roleId: row.role_id })),
    requesters: (
      rows.requesters.rows as Array<{
        id: string
        full_name: string
        user_id: string | null
      }>
    ).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      userId: row.user_id,
    })),
    technicians: (
      rows.technicians.rows as Array<{
        id: string
        full_name: string
        user_id: string | null
      }>
    ).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      userId: row.user_id,
    })),
  }
}

function mapScopes(rows: AccessRows) {
  const buildingsByScope = new Map<string, string[]>()
  for (const row of rows.scopeBuildings.rows as Array<{
    scope_id: string
    building_id: string
  }>) {
    const list = buildingsByScope.get(row.scope_id) ?? []
    list.push(row.building_id)
    buildingsByScope.set(row.scope_id, list)
  }
  return {
    scopes: (
      rows.scopes.rows as Array<{
        id: string
        user_id: string
        team_id: string
        active: boolean
      }>
    ).map((row) => ({
      id: row.id,
      userId: row.user_id,
      teamId: row.team_id,
      active: row.active,
      buildingIds: buildingsByScope.get(row.id) ?? [],
    })),
    technicianCategories: (
      rows.technicianCategories.rows as Array<{
        technician_id: string
        category_id: string
      }>
    ).map((row) => ({
      technicianId: row.technician_id,
      categoryId: row.category_id,
    })),
  }
}

function mapAccess(rows: AccessRows) {
  return {
    roles: rows.roles.rows,
    permissions: rows.permissions.rows,
    rolePermissions: (
      rows.rolePermissions.rows as Array<{
        role_id: string
        permission_id: string
        scope: string
      }>
    ).map((row) => ({
      roleId: row.role_id,
      permissionId: row.permission_id,
      scope: row.scope,
    })),
    ...mapPeople(rows),
    ...mapScopes(rows),
  }
}

export async function listAccess(db: Database) {
  return mapAccess(await listAccessRows(db))
}
