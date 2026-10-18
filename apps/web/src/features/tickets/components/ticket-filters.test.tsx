import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TicketFilters } from './ticket-filters'
import type { TicketListSearch } from '../schemas'

describe('TicketFilters', () => {
  it('aplica búsqueda, estado, edificio y categoría en un solo envío', () => {
    const onChange = vi.fn<(next: TicketListSearch) => void>()
    render(
      <TicketFilters
        value={{ page: 1 }}
        onChange={onChange}
        buildings={[{ id: 'b1', name: 'Edificio Central' }]}
        categories={[{ id: 'c1', name: 'Eléctrico', teamId: 't1' }]}
      />,
    )

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
})
