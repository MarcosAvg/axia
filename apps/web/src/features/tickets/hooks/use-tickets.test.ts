import { describe, expect, it } from 'vitest'
import type { PendingTicketAction } from '../domain/pending-actions'
import { projectPendingList } from '../domain/pending-actions'
import type { TicketListItem } from '../domain/types'

function item(id: string, status: TicketListItem['status']): TicketListItem {
  return {
    id,
    folio: `T-${id}`,
    status,
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
    isUnrouted: false,
  }
}

function action(
  ticketId: string,
  operation: PendingTicketAction['operation'],
  seq = 1,
): PendingTicketAction {
  return {
    id: `pending-${ticketId}-${seq}`,
    ticketId,
    seq,
    operation,
    args: {},
    occurredAt: '2026-11-04T10:00:00.000Z',
  }
}

describe('projectPendingList', () => {
  it('proyecta el estado de cada tiquet y lo marca como pendiente', () => {
    const result = projectPendingList(
      [item('ticket-1', 'assigned'), item('ticket-2', 'registered')],
      [action('ticket-1', 'start'), action('ticket-2', 'take')],
    )

    expect(result[0]).toMatchObject({
      status: 'in_progress',
      pendingSync: true,
    })
    expect(result[1]).toMatchObject({
      status: 'with_supervisor',
      pendingSync: true,
    })
  })

  it('conserva los elementos sin acciones y la lista original sin cola', () => {
    const items = [item('ticket-1', 'assigned')]
    expect(projectPendingList(items, [])).toBe(items)
    expect(projectPendingList(items, [action('ticket-2', 'start')])).toEqual(
      items,
    )
  })
})
