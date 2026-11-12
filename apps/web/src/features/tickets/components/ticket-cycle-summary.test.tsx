import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { TicketDetailWithTimes } from '../domain/types'
import { TicketCycleSummary } from './ticket-cycle-summary'

function renderSummary(times: TicketDetailWithTimes['cycleTimes']) {
  return render(
    <TooltipProvider>
      <TicketCycleSummary times={times} />
    </TooltipProvider>,
  )
}

const base: TicketDetailWithTimes['cycleTimes'] = {
  total: 100,
  response: 20,
  assignment: 0,
  pendingTake: 0,
  reassignment: 15,
  wait: 0,
  active: 50,
  pause: 30,
  dormant: 0,
  validation: 0,
  claim: 0,
}

describe('TicketCycleSummary', () => {
  it('muestra solo las fases con tiempo y ordena de mayor a menor', () => {
    renderSummary(base)

    const rows = screen.getAllByRole('term').map((row) => row.textContent)
    expect(rows[0]).toBe('Trabajo activo')
    expect(rows[1]).toBe('Pausa')
    expect(rows[2]).toBe('Respuesta')
    expect(screen.queryByText('Reclamación')).not.toBeInTheDocument()
  })

  it('separa la reasignación y explica que se mide aparte', () => {
    renderSummary(base)

    expect(screen.getByText('Reasignación')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Más información: Reasignación' }),
    ).toBeInTheDocument()
  })

  it('muestra el resto sin clasificar cuando el total no cuadra', () => {
    renderSummary({ ...base, total: 120 })

    expect(screen.getByText('Sin clasificar')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Más información: Sin clasificar' }),
    ).toBeInTheDocument()
  })

  it('mantiene el total y los porcentajes', () => {
    renderSummary(base)

    expect(screen.getByText('1 h 40 min')).toBeInTheDocument()
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0)
  })
})
