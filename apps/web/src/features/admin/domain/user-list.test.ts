import {
  accountNameFor,
  filterPeople,
  filterProfiles,
  linkedPersonName,
  roleLabelsOf,
} from './user-list'
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

describe('vínculos', () => {
  const people = [
    { fullName: 'Luis Gómez', userId: 'u1' },
    { fullName: 'Pedro Solís', userId: null },
  ]

  it('encuentra la persona vinculada a una cuenta', () => {
    expect(linkedPersonName(people, 'u1')).toBe('Luis Gómez')
    expect(linkedPersonName(people, 'u9')).toBeNull()
  })

  it('encuentra la cuenta de una persona', () => {
    expect(accountNameFor(profiles, 'u1')).toBe('Luis Gómez')
    expect(accountNameFor(profiles, null)).toBeNull()
  })

  it('filtra por nombre de persona o de su cuenta', () => {
    expect(filterPeople(people, profiles, 'pedro')).toHaveLength(1)
    expect(filterPeople(people, profiles, 'ana')).toEqual([])
  })
})
