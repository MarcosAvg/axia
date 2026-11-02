import type { Identity } from '@/features/auth'
import {
  actionsRequiringSubject,
  allowedActions,
  isProxyAction,
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
    technicianId: null,
    timezone: 'America/Mexico_City',
    mustChangePassword: false,
  }
}

function context(
  permissions: string[],
  status: TicketStatus,
  overrides: Partial<ActionContext> = {},
): ActionContext {
  return {
    identity: identityWith(permissions),
    status,
    isRequester: false,
    requesterValidated: false,
    isSupervisorRole: false,
    hasTaken: false,
    ...overrides,
  }
}

describe('allowedActions', () => {
  it('sin identidad no hay acciones', () => {
    expect(
      allowedActions({
        identity: null,
        status: 'in_progress',
        isRequester: false,
        requesterValidated: false,
        isSupervisorRole: false,
        hasTaken: false,
      }),
    ).toEqual([])
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

  it('el técnico avanza el subestado cuando el tiquet está pausado', () => {
    const actions = allowedActions(
      context(['ticket.pause', 'ticket.resume'], 'paused'),
    )
    expect(actions).toContain('advance_pause')
    expect(actions).toContain('resume')
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

describe('allowedActions after requester validation', () => {
  it('no deja acciones al solicitante que ya validó', () => {
    const actions = allowedActions(
      context(
        [
          'ticket.validate',
          'ticket.open_claim',
          'ticket.cancel',
          'ticket.mark_duplicate',
          'ticket.view',
        ],
        'attended',
        { isRequester: true, requesterValidated: true },
      ),
    )
    expect(actions).toEqual([])
  })

  it('quita la reclamación al solicitante validado en un tiquet cerrado', () => {
    const actions = allowedActions(
      context(['ticket.open_claim', 'ticket.view'], 'closed', {
        isRequester: true,
        requesterValidated: true,
      }),
    )
    expect(actions).not.toContain('open_claim')
    expect(actions).toContain('comment')
  })

  it('conserva las acciones del supervisor que validó a nombre del solicitante', () => {
    const actions = allowedActions(
      context(
        ['ticket.validate', 'ticket.validate_on_behalf', 'ticket.open_claim'],
        'attended',
        { isRequester: false, requesterValidated: true },
      ),
    )
    expect(actions).toContain('validate')
    expect(actions).toContain('open_claim')
  })

  it('no oculta acciones al solicitante antes de validar', () => {
    const actions = allowedActions(
      context(['ticket.validate', 'ticket.cancel'], 'attended', {
        isRequester: true,
        requesterValidated: false,
      }),
    )
    expect(actions).toContain('validate')
    expect(actions).toContain('cancel')
  })
})

describe('supervisor before take', () => {
  it('oculta las acciones designadas en un tiquet registrado sin tomar', () => {
    const actions = allowedActions(
      context(
        [
          'ticket.assign_technician',
          'ticket.recapture',
          'ticket.cancel',
          'ticket.prioritize',
          'ticket.mark_duplicate',
          'ticket.view',
        ],
        'registered',
        { isSupervisorRole: true, hasTaken: false },
      ),
    )
    expect(actions).not.toContain('assign_technician')
    expect(actions).not.toContain('recapture')
    expect(actions).not.toContain('cancel')
    expect(actions).not.toContain('change_priority')
    expect(actions).not.toContain('mark_duplicate')
    expect(actions).toContain('comment')
  })

  it('muestra las acciones después de tomar el tiquet', () => {
    const actions = allowedActions(
      context(['ticket.assign_technician'], 'with_supervisor', {
        isSupervisorRole: true,
        hasTaken: true,
      }),
    )
    expect(actions).toContain('assign_technician')
  })

  it('no limita al administrador ni al solicitante', () => {
    const adminActions = allowedActions(
      context(['ticket.assign_technician'], 'registered', {
        isSupervisorRole: false,
      }),
    )
    expect(adminActions).toContain('assign_technician')

    const requesterActions = allowedActions(
      context(['ticket.cancel'], 'registered', {
        isRequester: true,
        isSupervisorRole: true,
      }),
    )
    expect(requesterActions).toContain('cancel')
  })
})

describe('allowedActions (reclamaciones y descartes)', () => {
  it('permite recapturar solo antes de iniciar el trabajo', () => {
    expect(allowedActions(context(['ticket.recapture'], 'assigned'))).toContain(
      'recapture',
    )
    expect(
      allowedActions(context(['ticket.recapture'], 'in_progress')),
    ).not.toContain('recapture')
    expect(
      allowedActions(context(['ticket.recapture'], 'paused')),
    ).not.toContain('recapture')
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

  it('agrega auxiliar solo cuando ya hay trabajo en curso', () => {
    expect(
      allowedActions(context(['ticket.add_auxiliary'], 'in_progress')),
    ).toContain('add_auxiliary')
    expect(
      allowedActions(context(['ticket.add_auxiliary'], 'registered')),
    ).not.toContain('add_auxiliary')
    expect(
      allowedActions(context(['ticket.add_auxiliary'], 'attended')),
    ).not.toContain('add_auxiliary')
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

describe('isProxyAction', () => {
  it('solo las acciones del técnico admiten sujeto', () => {
    expect(isProxyAction('start')).toBe(true)
    expect(isProxyAction('recapture')).toBe(true)
    expect(isProxyAction('comment')).toBe(false)
    expect(isProxyAction('validate')).toBe(false)
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

  it('prefiere reanudar sobre avanzar el subestado', () => {
    expect(pickPrimaryAction(['advance_pause', 'resume'])).toBe('resume')
  })

  it('elige iniciar cuando el tiquet está asignado', () => {
    expect(pickPrimaryAction(['assign_technician', 'start'])).toBe('start')
  })

  it('no hay acción primaria sin acciones', () => {
    expect(pickPrimaryAction([])).toBeNull()
  })
})
