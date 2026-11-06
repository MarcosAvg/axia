import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { TicketListItem } from '../domain/types'
import { TicketBoard } from './ticket-board'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string
    params?: { ticketId?: string }
    children: ReactNode
  }) => (
    <a href={params?.ticketId ? to.replace('$ticketId', params.ticketId) : to}>
      {children}
    </a>
  ),
}))

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

describe('TicketBoard columns', () => {
  it('muestra una columna por estado activo con su conteo', () => {
    render(
      <TicketBoard
        items={[
          ticket({ id: '1', status: 'registered' }),
          ticket({ id: '2', status: 'assigned' }),
        ]}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /Registrado/ }),
    ).toHaveTextContent('1')
    expect(screen.getByRole('heading', { name: /Asignado/ })).toHaveTextContent(
      '1',
    )
    expect(
      screen.getByRole('heading', { name: /En proceso/ }),
    ).toHaveTextContent('0')
    expect(screen.getAllByText('Sin tiquets')).toHaveLength(5)
  })
})

describe('TicketBoard cards', () => {
  it('renderiza la tarjeta con folio, descripción y enlace al detalle', () => {
    render(
      <TicketBoard
        items={[
          ticket({
            id: 't1',
            folio: 'AX-1',
            status: 'in_progress',
            description: 'Fuga de agua',
          }),
        ]}
      />,
    )

    const link = screen.getByRole('link', { name: /AX-1/ })
    expect(link).toHaveAttribute('href', '/tickets/t1')
    expect(screen.getByText('Fuga de agua')).toBeInTheDocument()
  })

  it('marca solo las ofertas recibidas', () => {
    render(
      <TicketBoard
        items={[ticket({ id: 't1' }), ticket({ id: 't2' })]}
        offeredIds={new Set(['t1'])}
      />,
    )

    expect(screen.getAllByText('Oferta para ti')).toHaveLength(1)
  })
})

describe('TicketBoard optional data', () => {
  it('no rompe con edificio, categoría y prioridad nulos', () => {
    render(
      <TicketBoard
        items={[
          ticket({
            id: 't1',
            buildingName: null,
            categoryName: null,
            priorityName: null,
            priorityPosition: null,
          }),
        ]}
      />,
    )

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })

  it('muestra las insignias de duplicado, sin ruteo y sin sincronizar', () => {
    render(
      <TicketBoard
        items={[
          ticket({
            id: 't1',
            possibleDuplicate: true,
            isUnrouted: true,
            pendingSync: true,
          }),
        ]}
      />,
    )

    expect(screen.getByText('Posible duplicado')).toBeInTheDocument()
    expect(screen.getByText('Sin ruteo')).toBeInTheDocument()
    expect(screen.getByText('Sin sincronizar')).toBeInTheDocument()
  })
})
