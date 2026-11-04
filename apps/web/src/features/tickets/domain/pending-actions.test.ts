import { describe, expect, it } from 'vitest'
import type { TicketDetail, TicketStatus } from './types'
import { projectPendingStatus, projectPendingTicket } from './pending-actions'
import type { PendingOperation, PendingTicketAction } from './pending-actions'

function ticket(overrides: Partial<TicketDetail> = {}): TicketDetail {
  return {
    id: 'ticket-1',
    folio: 'T-1',
    status: 'assigned',
    reportedAt: '2026-11-04T10:00:00.000Z',
    closedAt: null,
    description: 'Falla de prueba',
    requesterName: 'Ana Pérez',
    possibleDuplicate: false,
    buildingName: null,
    categoryName: null,
    priorityName: null,
    priorityPosition: null,
    teamName: null,
    cycle: 1,
    buildingId: 'building-1',
    locationId: 'location-1',
    dependencyId: 'dependency-1',
    categoryId: 'category-1',
    subcategoryId: null,
    problemId: null,
    serviceTypeId: null,
    priorityId: 'priority-1',
    locationName: null,
    dependencyName: null,
    subcategoryName: null,
    problemName: null,
    serviceTypeName: null,
    channelName: null,
    requesterContact: null,
    duplicateOfId: null,
    duplicateOfFolio: null,
    requesterId: 'requester-1',
    requesterDependencyId: null,
    requesterDependencyName: null,
    isRequester: false,
    requesterValidated: false,
    hasTaken: false,
    isUnrouted: false,
    validationPolicy: 'supervisor',
    ...overrides,
  }
}

function action(
  operation: PendingOperation,
  seq = 1,
  args: Record<string, unknown> = {},
): PendingTicketAction {
  return {
    id: `pending-${seq}`,
    ticketId: 'ticket-1',
    seq,
    operation,
    args,
    occurredAt: '2026-11-04T10:00:00.000Z',
  }
}

describe('projectPendingTicket', () => {
  it('proyecta iniciar el trabajo sin modificar el tiquet original', () => {
    const original = ticket({ status: 'assigned' })
    const result = projectPendingTicket(original, [action('start')])

    expect(result.ticket.status).toBe('in_progress')
    expect(original.status).toBe('assigned')
    expect(result.pending).toHaveLength(1)
    expect(result.complete).toBe(true)
  })

  it('aplica una secuencia de trabajo en orden', () => {
    const result = projectPendingTicket(ticket(), [
      action('start', 1),
      action('pause', 2),
      action('advance_pause', 3),
      action('resume', 4),
      action('attend', 5),
    ])

    expect(result.ticket.status).toBe('attended')
    expect(result.complete).toBe(true)
  })

  it('detiene la proyección ante una transición inválida', () => {
    const result = projectPendingTicket(ticket({ status: 'registered' }), [
      action('start'),
      action('pause', 2),
    ])

    expect(result.ticket.status).toBe('registered')
    expect(result.complete).toBe(false)
    expect(result.pending).toHaveLength(2)
  })

  it('se detiene ante una acción ambigua y no proyecta las posteriores', () => {
    const result = projectPendingTicket(ticket({ status: 'with_supervisor' }), [
      action('assign_technician'),
      action('start', 2),
    ])

    expect(result.ticket.status).toBe('with_supervisor')
    expect(result.complete).toBe(false)
  })

  it('mantiene el estado en acciones que no lo cambian y continúa', () => {
    const result = projectPendingTicket(ticket({ status: 'in_progress' }), [
      action('comment', 1),
      action('change_priority', 2),
      action('attend', 3),
    ])

    expect(result.ticket.status).toBe('attended')
    expect(result.complete).toBe(true)
  })

  it('toma el tiquet y marca la toma local', () => {
    const result = projectPendingTicket(
      ticket({ status: 'registered', hasTaken: false }),
      [action('take')],
    )

    expect(result.ticket.status).toBe('with_supervisor')
    expect(result.ticket.hasTaken).toBe(true)
  })
})

describe('projectPendingTicket · validación y desenlaces', () => {
  it('proyecta la validación del solicitante y espera al supervisor en política both', () => {
    const requester = projectPendingTicket(
      ticket({
        status: 'attended',
        validationPolicy: 'both',
        requesterValidated: false,
      }),
      [action('validate', 1, { subjectRequesterId: 'requester-1' })],
    )
    expect(requester.ticket.status).toBe('attended')
    expect(requester.ticket.requesterValidated).toBe(true)

    const supervisor = projectPendingTicket(requester.ticket, [
      action('validate', 2),
    ])
    expect(supervisor.ticket.status).toBe('closed')
  })

  it('no proyecta una validación de supervisor antes del solicitante', () => {
    const result = projectPendingTicket(
      ticket({ status: 'attended', validationPolicy: 'both' }),
      [action('validate')],
    )

    expect(result.ticket.status).toBe('attended')
    expect(result.complete).toBe(false)
  })
})

describe('projectPendingTicket · desenlaces', () => {
  it('proyecta los desenlaces deterministas de una reclamación', () => {
    const upheld = projectPendingTicket(
      ticket({ status: 'under_claim', cycle: 2 }),
      [action('resolve_claim', 1, { resolution: 'upheld' })],
    )
    expect(upheld.ticket.status).toBe('assigned')
    expect(upheld.ticket.cycle).toBe(3)

    const dismissed = projectPendingTicket(ticket({ status: 'under_claim' }), [
      action('resolve_claim', 1, { resolution: 'dismissed' }),
    ])
    expect(dismissed.ticket.status).toBe('closed')
  })

  it('no inventa el estado previo al resolver una reclamación con tiquet nuevo', () => {
    const result = projectPendingTicket(ticket({ status: 'under_claim' }), [
      action('resolve_claim', 1, { resolution: 'new_ticket' }),
    ])

    expect(result.ticket.status).toBe('under_claim')
    expect(result.complete).toBe(false)
  })

  it('proyecta descartes y duplicados', () => {
    const rejected = projectPendingTicket(ticket({ status: 'in_progress' }), [
      action('reject'),
    ])
    expect(rejected.ticket.status).toBe('rejected')

    const cancelled = projectPendingTicket(ticket({ status: 'in_progress' }), [
      action('cancel'),
    ])
    expect(cancelled.ticket.status).toBe('cancelled')

    const duplicate = projectPendingTicket(ticket({ status: 'attended' }), [
      action('mark_duplicate'),
    ])
    expect(duplicate.ticket.status).toBe('duplicate')
  })
})

describe('projectPendingStatus', () => {
  it('proyecta el estado para listas sin banderas del detalle', () => {
    const status = projectPendingStatus('assigned' as TicketStatus, [
      action('start'),
      action('pause', 2),
    ])

    expect(status).toBe('paused')
  })

  it('devuelve el estado base cuando la secuencia no se puede proyectar', () => {
    const status = projectPendingStatus('with_supervisor', [
      action('assign_technician'),
    ])

    expect(status).toBe('with_supervisor')
  })
})
