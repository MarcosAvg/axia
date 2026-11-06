import type { TicketListItem } from './types'
import { BOARD_STATUSES, groupTicketsByStatus } from './board'

function ticket(
  overrides: Partial<TicketListItem> & { id: string },
): TicketListItem {
  return {
    folio: `AX-${overrides.id}`,
    status: 'registered',
    reportedAt: '2026-11-06T10:00:00.000Z',
    closedAt: null,
    description: 'Descripción',
    requesterName: 'Solicitante',
    possibleDuplicate: false,
    buildingName: 'Edificio',
    categoryName: 'Categoría',
    priorityName: 'Media',
    priorityPosition: 3,
    teamName: 'Equipo',
    isUnrouted: false,
    ...overrides,
  }
}

describe('groupTicketsByStatus', () => {
  it('devuelve una columna por estado activo en orden de flujo', () => {
    const columns = groupTicketsByStatus([])

    expect(BOARD_STATUSES).toEqual([
      'registered',
      'with_supervisor',
      'assigned',
      'in_progress',
      'paused',
      'attended',
      'under_claim',
    ])
    expect(columns.map((column) => column.status)).toEqual([...BOARD_STATUSES])
    expect(columns.every((column) => column.items.length === 0)).toBe(true)
  })

  it('agrupa cada tiquet en su columna', () => {
    const columns = groupTicketsByStatus([
      ticket({ id: '1', status: 'assigned' }),
      ticket({ id: '2', status: 'in_progress' }),
      ticket({ id: '3', status: 'assigned' }),
    ])

    const byStatus = Object.fromEntries(
      columns.map((column) => [
        column.status,
        column.items.map((item) => item.id),
      ]),
    )
    expect(byStatus.assigned).toHaveLength(2)
    expect(byStatus.assigned).toEqual(expect.arrayContaining(['1', '3']))
    expect(byStatus.in_progress).toEqual(['2'])
    expect(byStatus.paused).toEqual([])
  })
})

describe('order and filtering of board columns', () => {
  it('ordena cada columna por fecha reportada descendente sin mutar la entrada', () => {
    const input = [
      ticket({
        id: 'antiguo',
        status: 'assigned',
        reportedAt: '2026-11-01T10:00:00.000Z',
      }),
      ticket({
        id: 'reciente',
        status: 'assigned',
        reportedAt: '2026-11-06T10:00:00.000Z',
      }),
      ticket({
        id: 'medio',
        status: 'assigned',
        reportedAt: '2026-11-03T10:00:00.000Z',
      }),
    ]
    const originalOrder = input.map((item) => item.id)

    const assigned = groupTicketsByStatus(input).find(
      (column) => column.status === 'assigned',
    )

    expect(assigned?.items.map((item) => item.id)).toEqual([
      'reciente',
      'medio',
      'antiguo',
    ])
    expect(input.map((item) => item.id)).toEqual(originalOrder)
  })

  it('ignora los estados finales', () => {
    const columns = groupTicketsByStatus([
      ticket({ id: 'cerrado', status: 'closed' }),
      ticket({ id: 'activo', status: 'registered' }),
    ])

    expect(columns.flatMap((column) => column.items)).toHaveLength(1)
    expect(columns.flatMap((column) => column.items)[0]?.id).toBe('activo')
  })

  it('respeta una lista de estados distinta', () => {
    const columns = groupTicketsByStatus(
      [
        ticket({ id: '1', status: 'paused' }),
        ticket({ id: '2', status: 'assigned' }),
      ],
      ['assigned'],
    )

    expect(columns).toHaveLength(1)
    expect(columns[0]?.status).toBe('assigned')
    expect(columns[0]?.items.map((item) => item.id)).toEqual(['2'])
  })
})
