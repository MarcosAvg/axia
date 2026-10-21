// Funciones puras de identidad: qué puede hacer el usuario según sus permisos.
// No depende del cliente HTTP ni de React (sección 4 de convenciones).

export type PermissionScope = 'own' | 'team' | 'buildings' | 'all'

export interface Permission {
  permission: string
  scope: PermissionScope
}

export interface Identity {
  userId: string
  fullName: string
  phone: string | null
  active: boolean
  roles: string[]
  permissions: Permission[]
  /** Zona horaria de la instancia, para mostrar fechas de forma consistente. */
  timezone: string
  mustChangePassword: boolean
}

/** Verdadero si la identidad tiene el permiso, en cualquier ámbito. */
export function can(identity: Identity | null, permission: string): boolean {
  if (!identity) return false
  return identity.permissions.some((item) => item.permission === permission)
}

/** Verdadero si tiene al menos uno de los permisos. */
export function canAny(
  identity: Identity | null,
  permissions: string[],
): boolean {
  return permissions.some((permission) => can(identity, permission))
}

/** Ámbito efectivo del permiso, o `null` si no lo tiene. */
export function scopeOf(
  identity: Identity | null,
  permission: string,
): PermissionScope | null {
  const match = identity?.permissions.find(
    (item) => item.permission === permission,
  )
  return match?.scope ?? null
}
