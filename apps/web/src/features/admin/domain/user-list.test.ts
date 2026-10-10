import { filterProfiles, roleLabelsOf } from './user-list'
import type { Profile, Role, UserRole } from './access'

const roles: Role[] = [
  { id: 'r1', name: 'admin', label: 'Administrador', active: true },
  { id: 'r2', name: 'tech', label: 'Técnico', active: true },
]
const assignments: UserRole[] = [
  { userId: 'u1', roleId: 'r2' },
  { userId: 'u2', roleId: 'r1' },
]
const profiles: Profile[] = [
  { id: 'u1', fullName: 'Luis Gómez', phone: null, active: true },
  { id: 'u2', fullName: 'Ana Pérez', phone: null, active: true },
]

describe('roleLabelsOf', () => {
  it('devuelve las etiquetas de los roles asignados', () => {
    expect(roleLabelsOf(roles, assignments, 'u2')).toEqual(['Administrador'])
    expect(roleLabelsOf(roles, assignments, 'u3')).toEqual([])
  })
})

describe('filterProfiles', () => {
  it('sin término devuelve todos', () => {
    expect(filterProfiles(profiles, roles, assignments, '  ')).toHaveLength(2)
  })

  it('busca por nombre', () => {
    expect(
      filterProfiles(profiles, roles, assignments, 'luis').map((p) => p.id),
    ).toEqual(['u1'])
  })

  it('busca por etiqueta de rol', () => {
    expect(
      filterProfiles(profiles, roles, assignments, 'admin').map((p) => p.id),
    ).toEqual(['u2'])
  })
})
