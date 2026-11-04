import type { Identity } from '@/features/auth'
import { allowedActions } from './actions'

const admin: Identity = {
  userId: 'admin',
  fullName: 'Administración',
  phone: null,
  active: true,
  roles: ['administrator'],
  permissions: [{ permission: 'ticket.assign_supervisor', scope: 'all' }],
  technicianId: null,
  timezone: 'America/Mexico_City',
  mustChangePassword: false,
}

describe('reasignación administrativa', () => {
  it('permite reasignar un tiquet registrado sin ruteo', () => {
    expect(
      allowedActions({
        identity: admin,
        status: 'registered',
        isRequester: false,
        requesterValidated: false,
        isSupervisorRole: false,
        hasTaken: false,
      }),
    ).toContain('assign_supervisor')
  })
})
