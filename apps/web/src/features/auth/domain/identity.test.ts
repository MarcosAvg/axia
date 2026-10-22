import { can, canAny, scopeOf } from './identity'
import type { Identity, Permission } from './identity'

function makeIdentity(permissions: Permission[]): Identity {
  return {
    userId: 'u1',
    fullName: 'Prueba',
    phone: null,
    active: true,
    roles: ['supervisor'],
    permissions,
    technicianId: null,
    timezone: 'America/Mexico_City',
    mustChangePassword: false,
  }
}

const identity = makeIdentity([
  { permission: 'ticket.view', scope: 'buildings' },
  { permission: 'ticket.validate', scope: 'team' },
])

describe('can', () => {
  it('es falso sin identidad', () => {
    expect(can(null, 'ticket.view')).toBe(false)
  })

  it('es verdadero si la identidad tiene el permiso', () => {
    expect(can(identity, 'ticket.view')).toBe(true)
  })

  it('es falso si la identidad no tiene el permiso', () => {
    expect(can(identity, 'user.manage')).toBe(false)
  })
})

describe('canAny', () => {
  it('es verdadero si tiene al menos uno', () => {
    expect(canAny(identity, ['user.manage', 'ticket.validate'])).toBe(true)
  })

  it('es falso sin ninguno', () => {
    expect(canAny(identity, ['user.manage', 'role.manage'])).toBe(false)
  })
})

describe('scopeOf', () => {
  it('devuelve el ámbito del permiso', () => {
    expect(scopeOf(identity, 'ticket.view')).toBe('buildings')
  })

  it('devuelve null si no tiene el permiso', () => {
    expect(scopeOf(identity, 'user.manage')).toBeNull()
  })
})
