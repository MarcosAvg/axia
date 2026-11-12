import { fireEvent, render, screen } from '@testing-library/react'
import { MeasureSelect } from './measure-select'
import { TimeMeasureProvider } from './time-measure-provider'

function renderSelect() {
  return render(
    <TimeMeasureProvider>
      <MeasureSelect />
    </TimeMeasureProvider>,
  )
}

describe('MeasureSelect', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('empieza en promedio y permite elegir la mediana', () => {
    renderSelect()
    const select = screen.getByRole('combobox', {
      name: 'Elegir la medida de tiempos',
    })
    expect(select).toHaveValue('average')

    fireEvent.change(select, { target: { value: 'median' } })

    expect(select).toHaveValue('median')
  })
})
