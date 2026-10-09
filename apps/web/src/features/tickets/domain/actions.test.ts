import type { Identity } from '@/features/auth'
import {
  actionsRequiringSubject,
  allowedActions,
  pickPrimaryAction,
} from './actions'
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
    timezone: 'America/Mexico_City',
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

  it('habilita las acciones del técnico con act_on_behalf (proxy)', () => {
    expect(allowedActions(context(['act_on_behalf'], 'assigned'))).toContain(
      'start',
    )
    expect(allowedActions(context(['act_on_behalf'], 'in_progress'))).toContain(
      'attend',
    )
  })
})

describe('allowedActions (reclamaciones y descartes)', () => {
  it('permite recapturar con permiso en estados no finales', () => {
    expect(
      allowedActions(context(['ticket.recapture'], 'in_progress')),
    ).toContain('recapture')
  })

  it('abre reclamación solo si está atendido o cerrado', () => {
    expect(
      allowedActions(context(['ticket.open_claim'], 'attended')),
    ).toContain('open_claim')
    expect(
      allowedActions(context(['ticket.open_claim'], 'in_progress')),
    ).not.toContain('open_claim')
  })

  it('resuelve la reclamación solo en under_claim', () => {
    expect(
      allowedActions(context(['ticket.resolve_claim'], 'under_claim')),
    ).toContain('resolve_claim')
  })

  it('reactiva solo un tiquet descartado', () => {
    expect(
      allowedActions(context(['ticket.reactivate'], 'rejected')),
    ).toContain('reactivate')
    expect(
      allowedActions(context(['ticket.reactivate'], 'in_progress')),
    ).not.toContain('reactivate')
  })

  it('reasigna supervisor solo con responsable', () => {
    expect(
      allowedActions(context(['ticket.assign_supervisor'], 'with_supervisor')),
    ).toContain('assign_supervisor')
    expect(
      allowedActions(context(['ticket.assign_supervisor'], 'registered')),
    ).not.toContain('assign_supervisor')
  })

  it('agrega auxiliar en estados no finales', () => {
    expect(
      allowedActions(context(['ticket.add_auxiliary'], 'in_progress')),
    ).toContain('add_auxiliary')
  })
})

describe('actionsRequiringSubject', () => {
  it('exige sujeto para acciones de proxy sin permiso directo', () => {
    const blocked = actionsRequiringSubject(
      identityWith(['act_on_behalf']),
      ['start', 'pause', 'comment'],
      false,
    )
    expect(blocked).toContain('start')
    expect(blocked).toContain('pause')
    expect(blocked).not.toContain('comment')
  })

  it('no exige sujeto si ya se eligió técnico o hay permiso directo', () => {
    expect(
      actionsRequiringSubject(identityWith(['act_on_behalf']), ['start'], true),
    ).toEqual([])
    expect(
      actionsRequiringSubject(identityWith(['ticket.start']), ['start'], false),
    ).toEqual([])
  })
})

describe('pickPrimaryAction', () => {
  it('prefiere validar cuando hay varias acciones', () => {
    expect(pickPrimaryAction(['comment', 'validate', 'reject'])).toBe(
      'validate',
    )
  })

  it('prefiere atender sobre pausar en proceso', () => {
    expect(pickPrimaryAction(['pause', 'attend', 'comment'])).toBe('attend')
  })

  it('elige iniciar cuando el tiquet está asignado', () => {
    expect(pickPrimaryAction(['assign_technician', 'start'])).toBe('start')
  })

  it('no hay acción primaria sin acciones', () => {
    expect(pickPrimaryAction([])).toBeNull()
  })
})
