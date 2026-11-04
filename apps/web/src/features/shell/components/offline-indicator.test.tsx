import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OfflineIndicator } from './offline-indicator'

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useLiveQuery: vi.fn(),
  processOutbox: vi.fn(),
}))

vi.mock('@/features/auth', () => ({ useAuth: mocks.useAuth }))
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: mocks.useLiveQuery }))
vi.mock('@/lib/offline/outbox', () => ({
  processOutbox: mocks.processOutbox,
  retryOutboxItem: vi.fn(),
  discardOutboxItem: vi.fn(),
}))

const originalOnline = navigator.onLine

beforeEach(() => {
  mocks.useAuth.mockReturnValue({
    session: { user: { id: 'user-a' } },
    isOfflineSession: false,
  })
  mocks.useLiveQuery.mockReset()
  mocks.processOutbox.mockReset()
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  })
})

afterAll(() => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: originalOnline,
  })
})

describe('OfflineIndicator', () => {
  it('permite sincronizar los pendientes ahora', () => {
    mocks.useLiveQuery.mockReturnValueOnce(2).mockReturnValueOnce([])
    render(<OfflineIndicator />)

    fireEvent.click(screen.getByRole('button', { name: /Sincronizar ahora/ }))
    expect(mocks.processOutbox).toHaveBeenCalledTimes(1)
  })

  it('muestra la sesión sin conexión aunque el navegador diga estar en línea', () => {
    mocks.useAuth.mockReturnValue({
      session: { user: { id: 'user-a' } },
      isOfflineSession: true,
    })
    mocks.useLiveQuery.mockReturnValueOnce(0).mockReturnValueOnce([])
    render(<OfflineIndicator />)

    expect(screen.getByText('Sesión sin conexión')).toBeVisible()
  })

  it('sin conexión no ofrece el botón de sincronizar', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    })
    mocks.useLiveQuery.mockReturnValueOnce(2).mockReturnValueOnce([])
    render(<OfflineIndicator />)

    expect(screen.getByText('Sin conexión')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /Sincronizar ahora/ }),
    ).toBeNull()
  })
})
