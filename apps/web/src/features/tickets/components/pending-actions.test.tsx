import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PendingTicketAction } from '../domain/pending-actions'
import { PendingActions } from './pending-actions'

function action(
  operation: PendingTicketAction['operation'],
  seq: number,
): PendingTicketAction {
  return {
    id: `pending-${seq}`,
    ticketId: 'ticket-1',
    seq,
    operation,
    args: {},
    occurredAt: '2026-11-04T10:00:00.000Z',
  }
}

describe('PendingActions', () => {
  it('muestra las acciones en cola con su etiqueta', () => {
    render(
      <PendingActions actions={[action('start', 1), action('comment', 2)]} />,
    )

    expect(
      screen.getByText('Cambios pendientes de sincronizar'),
    ).toBeInTheDocument()
    expect(screen.getByText('Iniciar')).toBeInTheDocument()
    expect(screen.getByText('Comentar')).toBeInTheDocument()
  })

  it('no renderiza nada sin acciones pendientes', () => {
    const { container } = render(<PendingActions actions={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
