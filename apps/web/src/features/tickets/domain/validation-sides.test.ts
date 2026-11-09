import { allowedActions } from './actions'
import { context } from './actions-test-helpers'

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
        {
          isRequester: true,
          requesterValidated: true,
          canValidateSupervisor: false,
        },
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
    expect(actions).toContain('validate_supervisor')
    expect(actions).toContain('open_claim')
  })

  it('no oculta acciones al solicitante antes de validar', () => {
    const actions = allowedActions(
      context(['ticket.validate', 'ticket.cancel'], 'attended', {
        isRequester: true,
        requesterValidated: false,
      }),
    )
    expect(actions).toContain('validate_requester')
    expect(actions).toContain('cancel')
  })
})

describe('validación por lado', () => {
  it('muestra el lado del solicitante primero cuando la cuenta puede validar ambos', () => {
    const actions = allowedActions(
      context([], 'attended', {
        isRequester: true,
        canValidateRequester: true,
        canValidateSupervisor: true,
        validationPolicy: 'both',
      }),
    )
    expect(actions).toContain('validate_requester')
    expect(actions).not.toContain('validate_supervisor')
  })

  it('tras validar el solicitante conserva el lado del supervisor', () => {
    const actions = allowedActions(
      context([], 'attended', {
        isRequester: true,
        requesterValidated: true,
        canValidateRequester: true,
        canValidateSupervisor: true,
        validationPolicy: 'both',
      }),
    )
    expect(actions).toEqual(['validate_supervisor'])
  })

  it('no muestra el lado del supervisor antes del solicitante', () => {
    const actions = allowedActions(
      context([], 'attended', {
        canValidateSupervisor: true,
        validationPolicy: 'both',
      }),
    )
    expect(actions).not.toContain('validate_supervisor')
  })

  it('respeta la política supervisor y la requester', () => {
    expect(
      allowedActions(
        context([], 'attended', {
          canValidateSupervisor: true,
          validationPolicy: 'supervisor',
        }),
      ),
    ).toContain('validate_supervisor')
    expect(
      allowedActions(
        context([], 'attended', {
          canValidateRequester: true,
          validationPolicy: 'requester',
        }),
      ),
    ).toContain('validate_requester')
  })
})
