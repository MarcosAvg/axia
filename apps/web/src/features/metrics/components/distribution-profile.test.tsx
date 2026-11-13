import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TimeMeasureProvider } from '@/components/shared/time-measure-provider'
import type { DistributionProfileRow } from '../domain/metrics'
import { DistributionProfileCard } from './distribution-profile'

const profile: DistributionProfileRow[] = [
  {
    phase: 'total',
    n: 4,
    total: 10,
    coverage: 0.4,
    mean: 10.7,
    median: 5.5,
    p25: 3.25,
    p75: 7.75,
    p90: 14.1,
    p95: 37.05,
    max: 60,
    lowerFence: -3.5,
    upperFence: 14.5,
    outliers: 1,
    outlierRate: 0.25,
  },
]

function renderCard() {
  return render(
    <TooltipProvider>
      <TimeMeasureProvider>
        <DistributionProfileCard profile={profile} mode="calendar" />
      </TimeMeasureProvider>
    </TooltipProvider>,
  )
}

describe('DistributionProfileCard', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('axia.time-aggregation', 'median')
  })

  it('muestra la muestra como n / N y no incluye la columna P95', () => {
    renderCard()

    expect(screen.getByText('n / N')).toBeInTheDocument()
    expect(screen.getByText('P90')).toBeInTheDocument()
    expect(screen.queryByText('P95')).not.toBeInTheDocument()
    expect(screen.getByTitle('4 de 10 tiquets')).toHaveTextContent(
      /4\s*\/\s*10/,
    )
  })

  it('resalta la columna de la medida activa', () => {
    renderCard()

    expect(
      screen.getByRole('columnheader', { name: /Mediana/ }),
    ).toHaveAttribute('data-active', 'true')
    expect(
      screen.getByRole('columnheader', { name: /P90/ }),
    ).not.toHaveAttribute('data-active')
  })

  it('explica que n no cambia con la medida', () => {
    renderCard()

    expect(screen.getByText(/no cambia al elegir/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Más información: n / N' }),
    ).toBeInTheDocument()
  })

  it('explica el acumulado cuando no hay columna equivalente', () => {
    window.localStorage.setItem('axia.time-aggregation', 'total')
    renderCard()

    expect(
      screen.getByText(/El acumulado no tiene una columna/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: /activa/ }),
    ).not.toBeInTheDocument()
  })
})
