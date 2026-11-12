import { fireEvent, render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { DistributionProfileRow } from '../domain/metrics'
import { PhaseRangeChart } from './phase-range-chart'

const row: DistributionProfileRow = {
  phase: 'active',
  n: 10,
  total: 20,
  coverage: 0.5,
  mean: 130,
  median: 120,
  p25: 60,
  p75: 180,
  p90: 240,
  p95: 270,
  max: 300,
  lowerFence: -120,
  upperFence: 360,
  outliers: 2,
  outlierRate: 0.2,
}

function renderChart(profile: DistributionProfileRow[] = [row]) {
  return render(
    <TooltipProvider delayDuration={0}>
      <PhaseRangeChart profile={profile} measure="median" />
    </TooltipProvider>,
  )
}

describe('PhaseRangeChart', () => {
  it('muestra la fase, su muestra y el valor de la medida activa', () => {
    renderChart()

    expect(screen.getByText('Trabajo activo')).toBeInTheDocument()
    expect(screen.getByText('n 10')).toBeInTheDocument()
    expect(screen.getByText('2 h')).toBeInTheDocument()
    expect(screen.getByText(/Barra: P25–P75/)).toBeInTheDocument()
  })

  it('muestra los valores exactos en el tooltip de la fila', async () => {
    renderChart()
    const range = screen.getByRole('button', { name: /Trabajo activo/ })
    fireEvent.mouseEnter(range)
    fireEvent.focus(range)

    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent('P25')
    expect(tooltip).toHaveTextContent('1 h')
    expect(tooltip).toHaveTextContent('Máximo')
    expect(tooltip).toHaveTextContent('Atípicos')
    expect(tooltip).toHaveTextContent('20%')
  })

  it('explica que no hay datos cuando todas las fases tienen muestra cero', () => {
    renderChart([{ ...row, n: 0 }])

    expect(
      screen.getByText('No hay datos con estos filtros.'),
    ).toBeInTheDocument()
  })
})
