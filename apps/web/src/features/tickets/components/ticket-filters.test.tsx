import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TicketFilters } from './ticket-filters'
import type { TicketListSearch } from '../schemas'

const originalMatchMedia = window.matchMedia

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

function renderFilters(onChange: (next: TicketListSearch) => void) {
  render(
    <TicketFilters
      value={{ page: 1 }}
      onChange={onChange}
      buildings={[{ id: 'b1', name: 'Edificio Central' }]}
      categories={[{ id: 'c1', name: 'Eléctrico' }]}
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

  it('en móvil abre los filtros en una hoja y los aplica', () => {
    mockMatchMedia(false)
    const onChange = vi.fn<(next: TicketListSearch) => void>()
    renderFilters(onChange)

    expect(screen.queryByLabelText('Estado')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }))
    fireEvent.change(screen.getByLabelText('Estado'), {
      target: { value: 'registered' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(onChange).toHaveBeenCalledWith({
      status: 'registered',
      buildingId: undefined,
      categoryId: undefined,
      page: 1,
    })
  })
})
