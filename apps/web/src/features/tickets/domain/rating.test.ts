import type { Identity } from '@/features/auth'
import type { ProxySubject } from './actions'
import { canRateTicket } from './rating'
import type { TicketStatus } from './types'

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

const own = {
  isRequester: true,
  subject: null,
} as const
const asRequester = {
  isRequester: false,
  subject: { kind: 'requester', requesterId: 'r1' } as const,
}

function rate(
  identity: Identity,
  status: TicketStatus,
  requesterValidated: boolean,
  options: { isRequester: boolean; subject: ProxySubject } = own,
) {
  return canRateTicket({
    identity,
    status,
    requesterValidated,
    ...options,
  })
}

describe('canRateTicket', () => {
  it('permite calificar al solicitante que ya validó aunque siga atendido', () => {
    expect(rate(requester, 'attended', true)).toBe(true)
  })

  it('no permite calificar antes de validar ni fuera de los estados válidos', () => {
    expect(rate(requester, 'attended', false)).toBe(false)
    expect(rate(requester, 'in_progress', true)).toBe(false)
  })

  it('conserva la calificación de un tiquet cerrado', () => {
    expect(rate(requester, 'closed', false)).toBe(true)
  })

  it('permite calificar a nombre del solicitante solo con el sujeto explícito', () => {
    expect(rate(supervisor, 'attended', true, asRequester)).toBe(true)
    expect(
      rate(supervisor, 'attended', true, { isRequester: false, subject: null }),
    ).toBe(false)
  })

  it('no permite calificar sin permiso', () => {
    expect(rate(identityWith([]), 'closed', false)).toBe(false)
  })
})
