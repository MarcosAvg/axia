import { describe, expect, it } from 'vitest'

import type { Actor } from '../../src/auth/authorization.js'
import { canAttachEvidence } from '../../src/evidence/access.js'
import type { TicketAccess } from '../../src/tickets/access.js'

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    id: 'user-1',
    username: 'user',
    fullName: 'User',
    phone: null,
    active: true,
    timezone: 'America/Mexico_City',
    mustChangePassword: false,
    roles: [],
    permissions: [],
    requesterId: null,
    requesterUserId: null,
    technicianId: null,
    technicianTeamId: null,
    teamIds: [],
    supervisorScopes: [],
    ...overrides,
  }
}

function ticket(overrides: Partial<TicketAccess> = {}): TicketAccess {
  return {
    id: 'ticket-1',
    teamId: 'team-a',
    buildingId: 'building-a',
    requesterUserId: 'requester-user',
    registeredBy: 'requester-user',
    isTechnician: false,
    isParticipant: false,
    isSupervisor: false,
    ...overrides,
  }
}

const requester = actor({
  id: 'requester-user',
  requesterUserId: 'requester-user',
  permissions: [
    { id: 'ticket.view', scope: 'own' },
    { id: 'ticket.create', scope: 'own' },
    { id: 'ticket.open_claim', scope: 'own' },
  ],
})

const technician = actor({
  id: 'technician-user',
  technicianId: 'technician-1',
  permissions: [
    { id: 'ticket.view', scope: 'own' },
    { id: 'ticket.record_progress', scope: 'own' },
  ],
})

const supervisor = actor({
  teamIds: ['team-a'],
  permissions: [
    { id: 'ticket.view', scope: 'team' },
    { id: 'ticket.open_claim', scope: 'team' },
    { id: 'evidence.attach', scope: 'team' },
  ],
})

const admin = actor({
  permissions: [
    { id: 'ticket.view', scope: 'all' },
    { id: 'evidence.attach', scope: 'all' },
  ],
})

describe('canAttachEvidence', () => {
  it('permite al solicitante la evidencia de su reclamación', () => {
    expect(canAttachEvidence(requester, ticket(), 'claim')).toBe(true)
  })

  it('permite la foto de la solicitud a quien registró o pidió el tiquet', () => {
    expect(canAttachEvidence(requester, ticket(), 'request')).toBe(true)
    expect(
      canAttachEvidence(
        requester,
        ticket({ requesterUserId: 'otra-persona', registeredBy: 'otra' }),
        'request',
      ),
    ).toBe(false)
  })

  it('no permite al solicitante evidencias de trabajo ni otras', () => {
    for (const type of ['before', 'during', 'after', 'other'] as const) {
      expect(canAttachEvidence(requester, ticket(), type)).toBe(false)
    }
  })

  it('permite al técnico las evidencias del trabajo', () => {
    const access = ticket({ isTechnician: true })
    for (const type of ['before', 'during', 'after'] as const) {
      expect(canAttachEvidence(technician, access, type)).toBe(true)
    }
    expect(canAttachEvidence(technician, access, 'claim')).toBe(false)
  })

  it('permite al supervisor cualquier tipo por su permiso de evidencia', () => {
    for (const type of ['claim', 'request', 'before', 'other'] as const) {
      expect(canAttachEvidence(supervisor, ticket(), type)).toBe(true)
    }
  })

  it('permite al administrador cualquier tipo', () => {
    for (const type of ['claim', 'request', 'before', 'other'] as const) {
      expect(canAttachEvidence(admin, ticket(), type)).toBe(true)
    }
  })

  it('no permite reclamar a quien no puede abrir la reclamación', () => {
    expect(canAttachEvidence(technician, ticket(), 'claim')).toBe(false)
  })
})
