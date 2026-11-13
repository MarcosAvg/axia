import { render, screen } from '@testing-library/react'
import type { TicketDetailWithTimes } from '../domain/types'
import { TicketCycleChart } from './ticket-cycle-chart'

const times: TicketDetailWithTimes['cycleTimes'] = {
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

describe('TicketCycleChart', () => {
  it('describe la composición de las fases con tiempo', () => {
    render(<TicketCycleChart times={times} />)

    const chart = screen.getByRole('img', { name: /Composición del ciclo/ })
    expect(chart).toHaveAccessibleName(/Trabajo activo 50 min/)
    expect(chart).toHaveAccessibleName(/Pausa 30 min/)
    expect(chart).toHaveAccessibleName(/Respuesta 20 min/)
    expect(chart).not.toHaveAccessibleName(/Asignación/)
  })

  it('no dibuja la barra cuando no hay tiempos', () => {
    const { container } = render(
      <TicketCycleChart times={{ ...times, total: 0 }} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
