import type { Database } from '@axia/shared'

export type Scope = Database['public']['Enums']['permission_scope']

export const SCOPES: Scope[] = ['own', 'team', 'buildings', 'all']

export interface Role {
  id: string
  name: string
  label: string
  active: boolean
}

export interface Permission {
  id: string
  description: string
}

export interface RolePermission {
  roleId: string
  permissionId: string
  scope: Scope
}

export interface Profile {
  id: string
  fullName: string
  phone: string | null
  active: boolean
}

export interface UserRole {
  userId: string
  roleId: string
}

/** Orden de presentación de los grupos de permisos. */
const PERMISSION_GROUP_ORDER = [
  'ticket',
  'time',
  'evidence',
  'metrics',
  'data',
  'catalog',
  'user',
  'role',
  'assignment',
  'act_on_behalf',
] as const

export interface PermissionGroup {
  key: string
  permissions: Permission[]
}

/** Grupo de un permiso según el prefijo de su identificador. */
function permissionGroup(permissionId: string): string {
  const dot = permissionId.indexOf('.')
  return dot === -1 ? permissionId : permissionId.slice(0, dot)
}

/** Filtra grupos de permisos por descripción o identificador. */
export function filterPermissionGroups(
  groups: PermissionGroup[],
  query: string,
): PermissionGroup[] {
  const term = query.trim().toLocaleLowerCase('es-MX')
  if (!term) return groups
  return groups
    .map((group) => ({
      ...group,
      permissions: group.permissions.filter((permission) =>
        `${permission.id} ${permission.description}`
          .toLocaleLowerCase('es-MX')
          .includes(term),
      ),
    }))
    .filter((group) => group.permissions.length > 0)
}

/** Agrupa los permisos por área, en un orden estable. */
export function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const map = new Map<string, Permission[]>()
  for (const permission of permissions) {
    const key = permissionGroup(permission.id)
    const list = map.get(key) ?? []
    list.push(permission)
    map.set(key, list)
  }
  const position = (key: string) => {
    const index = (PERMISSION_GROUP_ORDER as readonly string[]).indexOf(key)
    return index === -1 ? PERMISSION_GROUP_ORDER.length : index
  }
  return [...map.keys()]
    .sort((left, right) => position(left) - position(right))
    .map((key) => ({ key, permissions: map.get(key) ?? [] }))
}

export interface SupervisorScope {
  id: string
  userId: string
  teamId: string
  active: boolean
  buildingIds: string[]
}

export interface TechnicianCategory {
  technicianId: string
  categoryId: string
}

export interface LinkablePerson {
  id: string
  fullName: string
  userId: string | null
}
