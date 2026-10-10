import type { Profile, Role, UserRole } from './access'

/** Etiquetas de los roles asignados a un usuario, para mostrar o buscar. */
export function roleLabelsOf(
  roles: Role[],
  assignments: UserRole[],
  userId: string,
): string[] {
  return roles
    .filter((role) =>
      assignments.some(
        (item) => item.userId === userId && item.roleId === role.id,
      ),
    )
    .map((role) => role.label)
}

/** Filtra usuarios por nombre o etiqueta de rol (vacío = todos). */
export function filterProfiles(
  profiles: Profile[],
  roles: Role[],
  assignments: UserRole[],
  query: string,
): Profile[] {
  const term = query.trim().toLocaleLowerCase('es-MX')
  if (!term) return profiles
  return profiles.filter((profile) => {
    const haystack = [
      profile.fullName,
      ...roleLabelsOf(roles, assignments, profile.id),
    ]
      .join(' ')
      .toLocaleLowerCase('es-MX')
    return haystack.includes(term)
  })
}
