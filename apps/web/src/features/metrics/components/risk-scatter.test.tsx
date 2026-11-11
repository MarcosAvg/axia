import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { DimensionGroup, DimensionRow } from '../domain/dimensions'
import { RiskScatter, RiskTooltip } from './risk-scatter'

function row(
  id: string,
  name: string,
  tickets: number,
  reopenRate: number,
): DimensionRow {
  return { id, name, tickets, reopenRate, avgActive: 30 } as DimensionRow
}

function groups(): DimensionGroup[] {
  return [
    { dimension: 'category', row: row('a', 'Eléctrico', 12, 0.25) },
    { dimension: 'category', row: row('b', 'Plomería', 8, 0.5) },
  ]
}

describe('RiskScatter', () => {
  it('identifica cada punto con el nombre de su categoría', () => {
    render(
      <TooltipProvider>
        <RiskScatter
          groups={groups()}
          dimension="category"
          measure="reopen"
          mode="calendar"
          onMeasureChange={() => {}}
        />
      </TooltipProvider>,
    )

    expect(screen.getByText('Eléctrico')).toBeInTheDocument()
    expect(screen.getByText('Plomería')).toBeInTheDocument()
  })
})

describe('RiskTooltip', () => {
  it('muestra el nombre de la categoría y sus valores', () => {
    render(
      <RiskTooltip
        active
        payload={[
          {
            payload: {
              id: 'a',
              name: 'Eléctrico',
              tickets: 2,
              rate: 5,
              measureLabel: 'Reapertura',
              active: 125,
            },
          },
        ]}
      />,
    )

    expect(screen.getByText('Eléctrico')).toBeInTheDocument()
    expect(screen.getByText('5%')).toBeInTheDocument()
    expect(screen.getByText('2 h 5 min')).toBeInTheDocument()
  })

  it('no muestra nada cuando el punto no está activo', () => {
    const { container } = render(<RiskTooltip active={false} payload={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
