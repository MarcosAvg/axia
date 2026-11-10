import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TimeAlertBanner } from './time-alert-banner'

const alert = {
  id: 'alert-1',
  eventId: 7,
  eventType: 'comment' as const,
  kind: 'clock_skew',
  clientClockSkewMs: 3_600_000,
  suggestedOccurredAt: '2026-11-10T20:00:00.000Z',
  occurredAt: '2026-11-10T21:00:00.000Z',
  detectedAt: '2026-11-10T23:00:00.000Z',
}

const useTimeAlerts = vi.fn(() => ({ data: [alert] }))

vi.mock('../hooks/use-tickets', () => ({
  useTimeAlerts: () => useTimeAlerts(),
  useAdjustEventTime: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}))

vi.mock('@/features/auth', () => ({
  useAuth: () => ({ identity: {} }),
  can: () => true,
}))

describe('TimeAlertBanner', () => {
  it('muestra la alerta, el desfase y la acción de corrección', () => {
    render(<TimeAlertBanner ticketId="t1" />)
    expect(
      screen.getByText('Horas pendientes de corrección'),
    ).toBeInTheDocument()
    expect(screen.getByText('Comentario')).toBeInTheDocument()
    expect(
      screen.getByText('Desfase del dispositivo: 60 min.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Corregir hora' }),
    ).toBeInTheDocument()
  })

  it('no renderiza nada sin alertas', () => {
    useTimeAlerts.mockReturnValueOnce({ data: [] })
    const { container } = render(<TimeAlertBanner ticketId="t1" />)
    expect(container).toBeEmptyDOMElement()
  })
})
