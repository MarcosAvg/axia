import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFilterValues } from './ticket-filter-fields'
import type { TicketFilterCatalogs } from './ticket-filter-fields'
import { TicketFilters } from './ticket-filters'
import type { TicketListSearch } from '../schemas'

const originalMatchMedia = window.matchMedia

const catalogs: TicketFilterCatalogs = {
  buildings: [{ id: 'b1', name: 'Edificio Central' }],
  categories: [{ id: 'c1', name: 'Eléctrico' }],
  teams: [{ id: 't1', name: 'Mantenimiento' }],
  priorities: [{ id: 'p1', name: 'Alta' }],
  requesters: [
    {
      id: 'r1',
      fullName: 'Ana Pérez',
      contact: null,
      dependencyId: null,
      dependencyName: null,
      userId: null,
    },
  ],
  technicians: [
    { id: 'tech1', fullName: 'Luis Gómez', teamId: 't1', categoryIds: [] },
  ],
  dependencies: [{ id: 'd1', name: 'Sistemas' }],
  serviceTypes: [{ id: 's1', name: 'Correctivo' }],
}

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function renderFilters(
  onChange: (next: TicketListSearch) => void,
  showStatus = true,
) {
  render(
    <TicketFilters
      value={{ page: 1 }}
      onChange={onChange}
      catalogs={catalogs}
      showStatus={showStatus}
    />,
  )
}

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

describe('TicketFilters', () => {
  it('aplica búsqueda, estado, edificio y categoría en un solo envío', () => {
    mockMatchMedia(true)
    const onChange = vi.fn<(next: TicketListSearch) => void>()
    renderFilters(onChange)

    fireEvent.change(screen.getByLabelText('Buscar'), {
      target: { value: 'fuga' },
    })
    fireEvent.change(screen.getByLabelText('Estado'), {
      target: { value: 'registered' },
    })
    fireEvent.change(screen.getByLabelText('Edificio'), {
      target: { value: 'b1' },
    })
    fireEvent.change(screen.getByLabelText('Categoría'), {
      target: { value: 'c1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(onChange).toHaveBeenCalledWith({
      search: 'fuga',
      status: 'registered',
      buildingId: 'b1',
      categoryId: 'c1',
      page: 1,
    })
  })

  it('oculta el filtro de estado cuando el tablero lo pide', () => {
    mockMatchMedia(true)
    const onChange = vi.fn<(next: TicketListSearch) => void>()
    renderFilters(onChange, false)

    expect(screen.queryByLabelText('Estado')).toBeNull()
    expect(screen.getByLabelText('Edificio')).toBeInTheDocument()
    expect(screen.getByLabelText('Categoría')).toBeInTheDocument()
  })
})

describe('readFilterValues', () => {
  it('lee los filtros secundarios y las banderas', () => {
    const form = new FormData()
    form.set('filter-team', 't1')
    form.set('filter-priority', 'p1')
    form.set('filter-requester', 'r1')
    form.set('filter-technician', 'tech1')
    form.set('filter-dependency', 'd1')
    form.set('filter-service-type', 's1')
    form.set('filter-from', '2026-01-01')
    form.set('filter-to', '2026-01-31')
    form.set('filter-unrouted', 'on')
    form.set('filter-possible-duplicate', 'on')

    expect(readFilterValues(form, 'secondary')).toEqual({
      teamId: 't1',
      priorityId: 'p1',
      requesterId: 'r1',
      technicianId: 'tech1',
      dependencyId: 'd1',
      serviceTypeId: 's1',
      from: '2026-01-01',
      to: '2026-01-31',
      unrouted: true,
      possibleDuplicate: true,
    })
  })
})

describe('TicketFilters secundarios', () => {
  it('aplica los filtros secundarios desde Más filtros', () => {
    mockMatchMedia(true)
    const onChange = vi.fn<(next: TicketListSearch) => void>()
    renderFilters(onChange)

    fireEvent.click(screen.getByRole('button', { name: /Más filtros/ }))
    fireEvent.change(screen.getByLabelText('Equipo'), {
      target: { value: 't1' },
    })
    fireEvent.change(screen.getByLabelText('Prioridad'), {
      target: { value: 'p1' },
    })
    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-01-01' },
    })
    fireEvent.click(screen.getByLabelText('Solo sin ruteo'))
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(onChange).toHaveBeenCalledWith({
      teamId: 't1',
      priorityId: 'p1',
      requesterId: undefined,
      technicianId: undefined,
      dependencyId: undefined,
      serviceTypeId: undefined,
      from: '2026-01-01',
      to: undefined,
      unrouted: true,
      possibleDuplicate: undefined,
      page: 1,
    })
  })
})

describe('TicketFilters en móvil', () => {
  it('abre los filtros en una hoja y los aplica todos', () => {
    mockMatchMedia(false)
    const onChange = vi.fn<(next: TicketListSearch) => void>()
    renderFilters(onChange)

    expect(screen.queryByLabelText('Estado')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }))
    fireEvent.change(screen.getByLabelText('Estado'), {
      target: { value: 'registered' },
    })
    fireEvent.change(screen.getByLabelText('Equipo'), {
      target: { value: 't1' },
    })
    fireEvent.change(screen.getByLabelText('Prioridad'), {
      target: { value: 'p1' },
    })
    fireEvent.click(screen.getByLabelText('Solo sin ruteo'))
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(onChange).toHaveBeenCalledWith({
      search: undefined,
      status: 'registered',
      buildingId: undefined,
      categoryId: undefined,
      teamId: 't1',
      priorityId: 'p1',
      requesterId: undefined,
      technicianId: undefined,
      dependencyId: undefined,
      serviceTypeId: undefined,
      from: undefined,
      to: undefined,
      unrouted: true,
      possibleDuplicate: undefined,
      page: 1,
    })
  })
})
