import { fireEvent, render, screen } from '@testing-library/react'
import { AggregationToggle } from './aggregation-toggle'
import { TimeAggregationProvider } from './time-aggregation-provider'

function renderToggle() {
  return render(
    <TimeAggregationProvider>
      <AggregationToggle />
    </TimeAggregationProvider>,
  )
}

describe('AggregationToggle', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('empieza en promedio y cambia a acumulado', () => {
    renderToggle()
    const average = screen.getByRole('button', { name: 'Promedio' })
    const total = screen.getByRole('button', { name: 'Acumulado' })
    expect(average).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(total)

    expect(total).toHaveAttribute('aria-pressed', 'true')
    expect(average).toHaveAttribute('aria-pressed', 'false')
  })
})
