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

/** Perfiles que tienen un rol con el nombre indicado. */
export function profilesWithRole(
  profiles: Profile[],
  roles: Role[],
  assignments: UserRole[],
  roleName: string,
): Profile[] {
  const roleIds = new Set(
    roles
      .filter((role) => role.active && role.name === roleName)
      .map((role) => role.id),
  )
  return profiles.filter(
    (profile) =>
      profile.active &&
      assignments.some(
        (assignment) =>
          assignment.userId === profile.id && roleIds.has(assignment.roleId),
      ),
  )
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

export interface PersonLink {
  fullName: string
  userId: string | null
}

/** Nombre de la persona del catálogo vinculada a una cuenta. */
export function linkedPersonName(
  people: PersonLink[],
  userId: string,
): string | null {
  return people.find((person) => person.userId === userId)?.fullName ?? null
}

/** Nombre de la cuenta vinculada a una persona (o "—"). */
export function accountNameFor(
  profiles: Profile[],
  userId: string | null,
): string | null {
  if (!userId) return null
  return profiles.find((profile) => profile.id === userId)?.fullName ?? null
}

/** Filtra personas por nombre o por el de su cuenta vinculada. */
export function filterPeople<T extends PersonLink>(
  people: T[],
  profiles: Profile[],
  query: string,
): T[] {
  const term = query.trim().toLocaleLowerCase('es-MX')
  if (!term) return people
  return people.filter((person) =>
    [person.fullName, accountNameFor(profiles, person.userId)]
      .join(' ')
      .toLocaleLowerCase('es-MX')
      .includes(term),
  )
}
