import type { Identity } from '@/features/auth'
import {
  canRequesterProxy,
  isRequesterProxyAction,
  technicianSubject,
} from './actions'

function identityWith(permissions: string[]): Identity {
  return {
    userId: 'u1',
    fullName: 'Prueba',
    phone: null,
    active: true,
    roles: [],
    permissions: permissions.map((permission) => ({
      permission,
      scope: 'all' as const,
    })),
    technicianId: null,
    timezone: 'America/Mexico_City',
    mustChangePassword: false,
  }
}

describe('requester proxy', () => {
  it('reconoce las acciones que sustituyen al solicitante', () => {
    expect(isRequesterProxyAction('validate')).toBe(true)
    expect(isRequesterProxyAction('open_claim')).toBe(true)
    expect(isRequesterProxyAction('cancel')).toBe(true)
    expect(isRequesterProxyAction('start')).toBe(false)
  })

  it('habilita el proxy con cualquiera de sus permisos', () => {
    expect(canRequesterProxy(identityWith(['ticket.validate_on_behalf']))).toBe(
      true,
    )
    expect(canRequesterProxy(identityWith(['ticket.rate_on_behalf']))).toBe(
      true,
    )
    expect(canRequesterProxy(identityWith(['ticket.rate']))).toBe(false)
  })

  it('construye el sujeto técnico opcional', () => {
    expect(technicianSubject('t1')).toEqual({
      kind: 'technician',
      technicianId: 't1',
    })
    expect(technicianSubject(undefined)).toBeNull()
  })
})
