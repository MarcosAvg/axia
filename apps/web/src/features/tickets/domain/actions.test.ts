import type { Identity } from '@/features/auth'
import { allowedActions } from './actions'
import type { ActionContext } from './actions'
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
  }
}

function context(permissions: string[], status: TicketStatus): ActionContext {
  return { identity: identityWith(permissions), status }
}

describe('allowedActions', () => {
  it('sin identidad no hay acciones', () => {
    expect(allowedActions({ identity: null, status: 'in_progress' })).toEqual(
      [],
    )
  })

  it('el supervisor asigna técnico cuando el tiquet no está tomado', () => {
    const actions = allowedActions(
      context(['ticket.assign_technician', 'ticket.pause'], 'with_supervisor'),
    )
    expect(actions).toContain('assign_technician')
    expect(actions).not.toContain('start')
  })

  it('el técnico inicia cuando el tiquet está asignado', () => {
    const actions = allowedActions(
      context(['ticket.start', 'ticket.attend'], 'assigned'),
    )
    expect(actions).toContain('start')
    expect(actions).not.toContain('attend')
  })

  it('el técnico marca atendido en proceso', () => {
    const actions = allowedActions(
      context(['ticket.start', 'ticket.attend', 'ticket.pause'], 'in_progress'),
    )
    expect(actions).toContain('attend')
    expect(actions).toContain('pause')
  })

  it('el solicitante valida un tiquet atendido', () => {
    expect(allowedActions(context(['ticket.validate'], 'attended'))).toContain(
      'validate',
    )
  })

  it('no ofrece acciones cuyo estado no aplica', () => {
    expect(
      allowedActions(context(['ticket.validate'], 'in_progress')),
    ).not.toContain('validate')
  })
})
