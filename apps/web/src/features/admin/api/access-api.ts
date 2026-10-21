// Acceso a datos de administración contra la API de Axia.

import { apiFetch } from '@/lib/api-client'
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

type AccessResponse = {
  roles: Role[]
  permissions: Permission[]
  rolePermissions: RolePermission[]
  profiles: Profile[]
  userRoles: UserRole[]
  requesters: LinkablePerson[]
  technicians: LinkablePerson[]
  scopes: SupervisorScope[]
  technicianCategories: TechnicianCategory[]
}

function fetchAccess() {
  return apiFetch<AccessResponse>('/api/admin/access')
}

async function mutate(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
) {
  await apiFetch(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

export async function listRoles(): Promise<Role[]> {
  return (await fetchAccess()).roles
}

export async function createRole(values: {
  name: string
  label: string
}): Promise<void> {
  await mutate('/api/admin/access/roles', 'POST', values)
}

export async function updateRole(
  id: string,
  values: { label?: string; active?: boolean },
): Promise<void> {
  await mutate(`/api/admin/access/roles/${id}`, 'PATCH', values)
}

export async function listPermissions(): Promise<Permission[]> {
  return (await fetchAccess()).permissions
}

export async function listRolePermissions(): Promise<RolePermission[]> {
  return (await fetchAccess()).rolePermissions
}

export async function setRolePermission(
  roleId: string,
  permissionId: string,
  scope: Scope,
): Promise<void> {
  await mutate('/api/admin/access/role-permissions', 'POST', {
    roleId,
    permissionId,
    scope,
  })
}

export async function removeRolePermission(
  roleId: string,
  permissionId: string,
): Promise<void> {
  await mutate('/api/admin/access/role-permissions/remove', 'POST', {
    roleId,
    permissionId,
  })
}

export async function listProfiles(): Promise<Profile[]> {
  return (await fetchAccess()).profiles
}

export async function setProfileActive(
  id: string,
  active: boolean,
): Promise<void> {
  await mutate(`/api/admin/access/profiles/${id}`, 'PATCH', { active })
}

export async function listUserRoles(): Promise<UserRole[]> {
  return (await fetchAccess()).userRoles
}

export async function assignUserRole(
  userId: string,
  roleId: string,
): Promise<void> {
  await mutate('/api/admin/access/user-roles', 'POST', { userId, roleId })
}

export async function removeUserRole(
  userId: string,
  roleId: string,
): Promise<void> {
  await mutate('/api/admin/access/user-roles/remove', 'POST', {
    userId,
    roleId,
  })
}

export async function listLinkablePeople(): Promise<{
  requesters: LinkablePerson[]
  technicians: LinkablePerson[]
}> {
  const access = await fetchAccess()
  return { requesters: access.requesters, technicians: access.technicians }
}

export async function linkRequesterUser(
  requesterId: string,
  userId: string | null,
): Promise<void> {
  await mutate(`/api/admin/access/requesters/${requesterId}`, 'PATCH', {
    userId,
  })
}

export async function linkTechnicianUser(
  technicianId: string,
  userId: string | null,
): Promise<void> {
  await mutate(`/api/admin/access/technicians/${technicianId}`, 'PATCH', {
    userId,
  })
}

export async function listSupervisorScopes(): Promise<SupervisorScope[]> {
  return (await fetchAccess()).scopes
}

export async function createSupervisorScope(
  userId: string,
  teamId: string,
): Promise<void> {
  await mutate('/api/admin/access/scopes', 'POST', { userId, teamId })
}

export async function deleteSupervisorScope(id: string): Promise<void> {
  await mutate(`/api/admin/access/scopes/${id}`, 'DELETE')
}

export async function addScopeBuilding(
  scopeId: string,
  buildingId: string,
): Promise<void> {
  await mutate('/api/admin/access/scope-buildings', 'POST', {
    scopeId,
    buildingId,
  })
}

export async function removeScopeBuilding(
  scopeId: string,
  buildingId: string,
): Promise<void> {
  await mutate(
    `/api/admin/access/scope-buildings/${scopeId}/${buildingId}`,
    'DELETE',
  )
}

export async function listTechnicianCategories(): Promise<
  TechnicianCategory[]
> {
  return (await fetchAccess()).technicianCategories
}

export async function addTechnicianCategory(
  technicianId: string,
  categoryId: string,
): Promise<void> {
  await mutate('/api/admin/access/technician-categories', 'POST', {
    technicianId,
    categoryId,
  })
}

export async function removeTechnicianCategory(
  technicianId: string,
  categoryId: string,
): Promise<void> {
  await mutate(
    `/api/admin/access/technician-categories/${technicianId}/${categoryId}`,
    'DELETE',
  )
}
