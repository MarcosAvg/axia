import { fireEvent, render, screen, within } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { TimeMeasure } from '@/lib/time-measure'
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

function renderChart(
  profile: DistributionProfileRow[] = [row],
  measure: TimeMeasure = 'median',
) {
  return render(
    <TooltipProvider delayDuration={0}>
      <PhaseRangeChart profile={profile} measure={measure} />
    </TooltipProvider>,
  )
}

describe('PhaseRangeChart', () => {
  it('muestra la fase, su muestra y el valor de la medida activa', () => {
    renderChart()

    const rowItem = screen.getByRole('listitem')
    expect(screen.getByText('Trabajo activo')).toBeInTheDocument()
    expect(screen.getByText('n 10')).toBeInTheDocument()
    expect(within(rowItem).getByText('2 h')).toBeInTheDocument()
    expect(screen.getByText(/Barra: P25–P75/)).toBeInTheDocument()
    expect(screen.queryByText(/pueden superar el eje/)).not.toBeInTheDocument()
  })

  it('muestra una escala redondeada con marcas y el P90 más alto', () => {
    renderChart()

    expect(screen.getByText('5 h')).toBeInTheDocument()
    expect(screen.getByText(/Escala compartida: 0–5 h/)).toBeInTheDocument()
    expect(screen.getByText(/P90 más alto: 4 h/)).toBeInTheDocument()
  })

  it('avisa cuando la medida puede superar el eje', () => {
    renderChart([row], 'p95')

    expect(
      screen.getByText(/P95 y máximo pueden superar el eje/),
    ).toBeInTheDocument()
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
