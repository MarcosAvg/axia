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
