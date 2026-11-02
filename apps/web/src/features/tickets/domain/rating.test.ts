import type { Identity } from '@/features/auth'
import { canRateTicket } from './rating'

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

const requester = identityWith(['ticket.rate'])
const supervisor = identityWith(['ticket.rate_on_behalf'])

describe('canRateTicket', () => {
  it('permite calificar al solicitante que ya validó aunque siga atendido', () => {
    expect(canRateTicket(requester, 'attended', true)).toBe(true)
  })

  it('no permite calificar antes de validar ni fuera de los estados válidos', () => {
    expect(canRateTicket(requester, 'attended', false)).toBe(false)
    expect(canRateTicket(requester, 'in_progress', true)).toBe(false)
  })

  it('conserva la calificación de un tiquet cerrado', () => {
    expect(canRateTicket(requester, 'closed', false)).toBe(true)
  })

  it('permite calificar a nombre del solicitante con su permiso', () => {
    expect(canRateTicket(supervisor, 'attended', true)).toBe(true)
  })

  it('no permite calificar sin permiso', () => {
    expect(canRateTicket(identityWith([]), 'closed', false)).toBe(false)
  })
})
