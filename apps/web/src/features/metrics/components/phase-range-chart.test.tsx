import { render, screen } from '@testing-library/react'
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
  outliers: 0,
  outlierRate: 0,
}

describe('PhaseRangeChart', () => {
  it('muestra la fase, su muestra y el valor de la medida activa', () => {
    render(<PhaseRangeChart profile={[row]} measure="median" />)

    expect(screen.getByText('Trabajo activo')).toBeInTheDocument()
    expect(screen.getByText('n 10')).toBeInTheDocument()
    expect(screen.getByText('2 h')).toBeInTheDocument()
    expect(screen.getByText(/Barra: P25–P75/)).toBeInTheDocument()
  })

  it('explica que no hay datos cuando todas las fases tienen muestra cero', () => {
    render(<PhaseRangeChart profile={[{ ...row, n: 0 }]} measure="median" />)

    expect(
      screen.getByText('No hay datos con estos filtros.'),
    ).toBeInTheDocument()
  })
})
