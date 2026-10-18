import type { Profile, Role, UserRole } from './access'

/** Nombre del rol semilla que concentra la administración de la instancia. */
const ADMIN_ROLE_NAME = 'administrator'

export type GuardReason = 'self-deactivate' | 'last-admin' | 'admin-role'

export interface GuardResult {
  allowed: boolean
  reason?: GuardReason
}

export interface AccessContext {
  profiles: Profile[]
  roles: Role[]
  assignments: UserRole[]
  currentUserId?: string
}

const ALLOWED: GuardResult = { allowed: true }

/** Verdadero si el rol es el rol administrativo protegido. */
export function isAdminRole(role: Role): boolean {
  return role.name === ADMIN_ROLE_NAME
}

/** Cuentas activas que hoy tienen un rol administrativo activo. */
export function activeAdminIds(
  profiles: Profile[],
  roles: Role[],
  assignments: UserRole[],
): Set<string> {
  const adminRoles = new Set(
    roles
      .filter((role) => role.active && isAdminRole(role))
      .map((role) => role.id),
  )
  const activeProfiles = new Set(
    profiles.filter((profile) => profile.active).map((profile) => profile.id),
  )
  return new Set(
    assignments
      .filter(
        (assignment) =>
          adminRoles.has(assignment.roleId) &&
          activeProfiles.has(assignment.userId),
      )
      .map((assignment) => assignment.userId),
  )
}

/**
 * Una cuenta no puede desactivarse a sí misma ni dejar la instancia sin
 * administradores activos.
 */
export function canDeactivateProfile(
  profile: Profile,
  context: AccessContext,
): GuardResult {
  if (profile.id === context.currentUserId) {
    return { allowed: false, reason: 'self-deactivate' }
  }
  if (!profile.active) return ALLOWED
  const admins = activeAdminIds(
    context.profiles,
    context.roles,
    context.assignments,
  )
  if (admins.size <= 1 && admins.has(profile.id)) {
    return { allowed: false, reason: 'last-admin' }
  }
  return ALLOWED
}

/** Quitar el rol administrativo no puede dejar la instancia sin administradores. */
export function canRemoveUserRole(
  userId: string,
  role: Role,
  context: AccessContext,
): GuardResult {
  if (!role.active || !isAdminRole(role)) return ALLOWED
  const profile = context.profiles.find((item) => item.id === userId)
  if (!profile?.active) return ALLOWED
  const admins = activeAdminIds(
    context.profiles,
    context.roles,
    context.assignments,
  )
  if (admins.size <= 1 && admins.has(userId)) {
    return { allowed: false, reason: 'last-admin' }
  }
  return ALLOWED
}

/** El rol administrativo no se desactiva desde la interfaz. */
export function canDeactivateRole(role: Role): GuardResult {
  return isAdminRole(role) ? { allowed: false, reason: 'admin-role' } : ALLOWED
}

/** Los permisos del rol administrativo se muestran, pero no se editan. */
export function canEditRolePermissions(role: Role): boolean {
  return !isAdminRole(role)
}

/** Mensaje de interfaz para un bloqueo de seguridad. */
export function guardMessage(reason: GuardReason | undefined): string {
  switch (reason) {
    case 'self-deactivate':
      return 'No puedes desactivar tu propia cuenta.'
    case 'last-admin':
      return 'La instancia quedaría sin administradores activos.'
    case 'admin-role':
      return 'El rol Administrador está protegido y no se puede desactivar.'
    default:
      return 'Esta acción no está permitida.'
  }
}
