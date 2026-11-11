import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { DimensionGroup, DimensionRow } from '../domain/dimensions'
import { RiskScatter } from './risk-scatter'

function row(
  id: string,
  name: string,
  tickets: number,
  reopenRate: number,
): DimensionRow {
  return {
    id,
    name,
    tickets,
    reopenRate,
    recaptureRate: 0,
    reassignmentRate: 0,
    reopened: Math.round(tickets * reopenRate),
    closedOrReopened: tickets,
    recaptured: 0,
    reassigned: 0,
    avgActive: 30,
    avgActiveLabor: 20,
  } as unknown as DimensionRow
}

function groups(): DimensionGroup[] {
  return [
    { dimension: 'category', row: row('a', 'Eléctrico', 12, 0.25) },
    { dimension: 'category', row: row('b', 'Plomería', 8, 0.5) },
  ]
}

describe('RiskScatter', () => {
  it('muestra una fila por agrupación con su tasa', () => {
    const { container } = render(
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
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-risk-row]')).toHaveLength(2)
  })

  it('muestra el promedio global de la señal', () => {
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

    expect(screen.getByText(/Promedio/)).toBeInTheDocument()
  })
})
