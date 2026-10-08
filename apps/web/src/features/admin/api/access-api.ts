// Acceso a datos de roles, usuarios y ámbitos (escritura por RLS con role.manage /
// assignment.manage / user.manage; ADR 0018). Funciones explícitas para conservar el tipado.

import { supabase } from '@/lib/supabase'
import type {
  LinkablePerson,
  Permission,
  Profile,
  Role,
  RolePermission,
  Scope,
  SupervisorScope,
  TechnicianCategory,
  UserRole,
} from '../domain/access'

// --- Roles y permisos ---

export async function listRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('id, name, label, active')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createRole(values: {
  name: string
  label: string
}): Promise<void> {
  const { error } = await supabase.from('roles').insert(values)
  if (error) throw error
}

export async function updateRole(
  id: string,
  values: { label?: string; active?: boolean },
): Promise<void> {
  const { error } = await supabase.from('roles').update(values).eq('id', id)
  if (error) throw error
}

export async function listPermissions(): Promise<Permission[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('id, description')
    .order('id')
  if (error) throw error
  return data ?? []
}

export async function listRolePermissions(): Promise<RolePermission[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('role_id, permission_id, scope')
  if (error) throw error
  return (data ?? []).map((row) => ({
    roleId: row.role_id,
    permissionId: row.permission_id,
    scope: row.scope,
  }))
}

export async function setRolePermission(
  roleId: string,
  permissionId: string,
  scope: Scope,
): Promise<void> {
  const { error } = await supabase
    .from('role_permissions')
    .upsert({ role_id: roleId, permission_id: permissionId, scope })
  if (error) throw error
}

export async function removeRolePermission(
  roleId: string,
  permissionId: string,
): Promise<void> {
  const { error } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('permission_id', permissionId)
  if (error) throw error
}

// --- Usuarios ---

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, active')
    .order('full_name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    active: row.active,
  }))
}

export async function setProfileActive(
  id: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ active })
    .eq('id', id)
  if (error) throw error
}

export async function listUserRoles(): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, role_id')
  if (error) throw error
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    roleId: row.role_id,
  }))
}

export async function assignUserRole(
  userId: string,
  roleId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role_id: roleId })
  if (error) throw error
}

export async function removeUserRole(
  userId: string,
  roleId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId)
  if (error) throw error
}

// --- Vínculos con los catálogos de personas ---

export async function listLinkablePeople(): Promise<{
  requesters: LinkablePerson[]
  technicians: LinkablePerson[]
}> {
  const requesters = await supabase
    .from('requesters')
    .select('id, full_name, user_id')
    .order('full_name')
  if (requesters.error) throw requesters.error
  const technicians = await supabase
    .from('technicians')
    .select('id, full_name, user_id')
    .order('full_name')
  if (technicians.error) throw technicians.error
  return {
    requesters: (requesters.data ?? []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      userId: row.user_id,
    })),
    technicians: (technicians.data ?? []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      userId: row.user_id,
    })),
  }
}

export async function linkRequesterUser(
  requesterId: string,
  userId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('requesters')
    .update({ user_id: userId })
    .eq('id', requesterId)
  if (error) throw error
}

export async function linkTechnicianUser(
  technicianId: string,
  userId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('technicians')
    .update({ user_id: userId })
    .eq('id', technicianId)
  if (error) throw error
}

// --- Ámbitos de supervisor y designaciones ---

export async function listSupervisorScopes(): Promise<SupervisorScope[]> {
  const scopes = await supabase
    .from('supervisor_scopes')
    .select('id, user_id, team_id, active')
  if (scopes.error) throw scopes.error
  const buildings = await supabase
    .from('supervisor_scope_buildings')
    .select('scope_id, building_id')
  if (buildings.error) throw buildings.error
  const byScope = new Map<string, string[]>()
  for (const row of buildings.data ?? []) {
    const list = byScope.get(row.scope_id) ?? []
    list.push(row.building_id)
    byScope.set(row.scope_id, list)
  }
  return (scopes.data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id,
    active: row.active,
    buildingIds: byScope.get(row.id) ?? [],
  }))
}

export async function createSupervisorScope(
  userId: string,
  teamId: string,
): Promise<void> {
  const { error } = await supabase
    .from('supervisor_scopes')
    .insert({ user_id: userId, team_id: teamId })
  if (error) throw error
}

export async function deleteSupervisorScope(id: string): Promise<void> {
  const { error } = await supabase
    .from('supervisor_scopes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function addScopeBuilding(
  scopeId: string,
  buildingId: string,
): Promise<void> {
  const { error } = await supabase
    .from('supervisor_scope_buildings')
    .insert({ scope_id: scopeId, building_id: buildingId })
  if (error) throw error
}

export async function removeScopeBuilding(
  scopeId: string,
  buildingId: string,
): Promise<void> {
  const { error } = await supabase
    .from('supervisor_scope_buildings')
    .delete()
    .eq('scope_id', scopeId)
    .eq('building_id', buildingId)
  if (error) throw error
}

export async function listTechnicianCategories(): Promise<
  TechnicianCategory[]
> {
  const { data, error } = await supabase
    .from('technician_categories')
    .select('technician_id, category_id')
  if (error) throw error
  return (data ?? []).map((row) => ({
    technicianId: row.technician_id,
    categoryId: row.category_id,
  }))
}

export async function addTechnicianCategory(
  technicianId: string,
  categoryId: string,
): Promise<void> {
  const { error } = await supabase
    .from('technician_categories')
    .insert({ technician_id: technicianId, category_id: categoryId })
  if (error) throw error
}

export async function removeTechnicianCategory(
  technicianId: string,
  categoryId: string,
): Promise<void> {
  const { error } = await supabase
    .from('technician_categories')
    .delete()
    .eq('technician_id', technicianId)
    .eq('category_id', categoryId)
  if (error) throw error
}
