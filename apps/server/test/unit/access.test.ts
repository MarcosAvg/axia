import { describe, expect, it } from 'vitest'

import type { Actor } from '../../src/auth/authorization.js'
import {
  can,
  canAct,
  getPermissionScope,
  type TicketAccess,
} from '../../src/tickets/access.js'

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
    status: 'with_supervisor',
    requesterUserId: 'requester-user',
    registeredBy: 'requester-user',
    isTechnician: false,
    isParticipant: false,
    isSupervisor: false,
    ...overrides,
  }
}

describe('permission scopes', () => {
  it('selects the broadest scope across roles', () => {
    const user = actor({
      permissions: [
        { id: 'ticket.view', scope: 'own' },
        { id: 'ticket.view', scope: 'buildings' },
        { id: 'ticket.view', scope: 'team' },
      ],
    })
    expect(getPermissionScope(user, 'ticket.view')).toBe('buildings')
  })

  it('grants all to an all-scope role', () => {
    const user = actor({
      permissions: [{ id: 'ticket.view', scope: 'all' }],
    })
    expect(can(user, 'ticket.view', ticket())).toBe(true)
  })

  it('does not grant anything without the permission', () => {
    expect(can(actor(), 'ticket.view', ticket())).toBe(false)
  })
})

describe('own scope', () => {
  it('lets a requester see only their own ticket', () => {
    const user = actor({
      requesterId: 'requester-row-1',
      requesterUserId: 'requester-1',
      permissions: [{ id: 'ticket.view', scope: 'own' }],
    })
    expect(
      can(user, 'ticket.view', ticket({ requesterUserId: 'requester-user' })),
    ).toBe(false)
    expect(
      can(user, 'ticket.view', ticket({ requesterUserId: 'requester-1' })),
    ).toBe(true)
  })

  it('lets assigned technicians and participants act in their own scope', () => {
    const user = actor({
      technicianId: 'tech-1',
      permissions: [
        { id: 'ticket.view', scope: 'own' },
        { id: 'ticket.start', scope: 'own' },
        { id: 'ticket.pause', scope: 'own' },
        { id: 'ticket.validate', scope: 'own' },
      ],
    })
    const assigned = ticket({ isTechnician: true })
    const auxiliary = ticket({ isTechnician: false, isParticipant: true })

    expect(can(user, 'ticket.start', assigned)).toBe(true)
    expect(can(user, 'ticket.start', auxiliary)).toBe(true)
    expect(can(user, 'ticket.validate', assigned)).toBe(false)
  })

  it('lets the assigned supervisor see the ticket', () => {
    const user = actor({
      permissions: [{ id: 'ticket.view', scope: 'own' }],
    })
    expect(can(user, 'ticket.view', ticket({ isSupervisor: true }))).toBe(true)
  })
})

describe('team and building scopes', () => {
  it('limits team scope to the actor teams', () => {
    const user = actor({
      teamIds: ['team-a'],
      permissions: [{ id: 'ticket.view', scope: 'team' }],
    })
    expect(can(user, 'ticket.view', ticket())).toBe(true)
    expect(can(user, 'ticket.view', ticket({ teamId: 'team-b' }))).toBe(false)
  })

  it('requires the team and building pair for buildings scope', () => {
    const user = actor({
      supervisorScopes: [{ teamId: 'team-a', buildingIds: ['building-a'] }],
      permissions: [{ id: 'ticket.view', scope: 'buildings' }],
    })
    expect(can(user, 'ticket.view', ticket())).toBe(true)
    expect(can(user, 'ticket.view', ticket({ buildingId: 'building-b' }))).toBe(
      false,
    )
    expect(can(user, 'ticket.view', ticket({ teamId: 'team-b' }))).toBe(false)
  })
})

describe('action checks', () => {
  it('requires visibility before the action permission', () => {
    const user = actor({
      teamIds: ['team-a'],
      supervisorScopes: [{ teamId: 'team-a', buildingIds: ['building-a'] }],
      permissions: [
        { id: 'ticket.view', scope: 'buildings' },
        { id: 'ticket.pause', scope: 'team' },
      ],
    })
    const otherBuilding = ticket({ buildingId: 'building-b' })
    expect(can(user, 'ticket.pause', otherBuilding)).toBe(true)
    expect(canAct(user, 'ticket.pause', otherBuilding)).toBe(false)
  })

  it('allows creating a ticket without a ticket context', () => {
    const user = actor({
      permissions: [{ id: 'ticket.create', scope: 'own' }],
    })
    expect(can(user, 'ticket.create')).toBe(true)
  })

  it('does not grant an undefined own action', () => {
    const user = actor({
      permissions: [{ id: 'ticket.assign_technician', scope: 'own' }],
    })
    expect(can(user, 'ticket.assign_technician', ticket())).toBe(false)
  })
})

describe('supervisor must take before acting', () => {
  const supervisor = actor({
    roles: [{ id: 'supervisor-role', name: 'supervisor', label: 'Supervisor' }],
    teamIds: ['team-a'],
    permissions: [
      { id: 'ticket.assign_technician', scope: 'team' },
      { id: 'ticket.assign_supervisor', scope: 'team' },
      { id: 'ticket.recapture', scope: 'team' },
      { id: 'ticket.reject', scope: 'team' },
      { id: 'ticket.cancel', scope: 'team' },
      { id: 'ticket.prioritize', scope: 'team' },
      { id: 'ticket.mark_duplicate', scope: 'team' },
      { id: 'ticket.take_offer', scope: 'team' },
      { id: 'ticket.view', scope: 'team' },
    ],
  })

  it('blocks modifying actions on a registered ticket without take', () => {
    const registered = ticket({ status: 'registered' })
    for (const permission of [
      'ticket.assign_technician',
      'ticket.assign_supervisor',
      'ticket.recapture',
      'ticket.reject',
      'ticket.cancel',
      'ticket.prioritize',
      'ticket.mark_duplicate',
    ]) {
      expect(can(supervisor, permission, registered)).toBe(false)
    }
  })

  it('allows the offer and view before take', () => {
    const registered = ticket({ status: 'registered' })
    expect(can(supervisor, 'ticket.take_offer', registered)).toBe(true)
    expect(can(supervisor, 'ticket.view', registered)).toBe(true)
  })

  it('allows modifying actions after the supervisor took the ticket', () => {
    const taken = ticket({ status: 'with_supervisor', isSupervisor: true })
    expect(can(supervisor, 'ticket.assign_technician', taken)).toBe(true)
  })

  it('lets an administrator act on a registered ticket', () => {
    const admin = actor({
      roles: [
        { id: 'admin-role', name: 'administrator', label: 'Administrador' },
      ],
      permissions: [{ id: 'ticket.assign_technician', scope: 'all' }],
    })
    expect(
      can(admin, 'ticket.assign_technician', ticket({ status: 'registered' })),
    ).toBe(true)
  })
})
