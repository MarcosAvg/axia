import { act, render, waitFor } from '@testing-library/react'
import { AuthContext } from '@/features/auth'
import type { AuthContextValue } from '@/features/auth'
import { OfflineBootstrap } from './offline-bootstrap'

const mocks = vi.hoisted(() => ({ setupOffline: vi.fn() }))

vi.mock('@/app/offline', () => ({ setupOffline: mocks.setupOffline }))

const noopAsync = () => Promise.resolve()

function makeAuth(status: AuthContextValue['status']): AuthContextValue {
  return {
    status,
    session: null,
    identity: null,
    isIdentityLoading: false,
    signIn: noopAsync,
    signOut: noopAsync,
    refreshIdentity: noopAsync,
  }
}

function renderBootstrap(status: AuthContextValue['status']) {
  return render(
    <AuthContext.Provider value={makeAuth(status)}>
      <OfflineBootstrap />
    </AuthContext.Provider>,
  )
}

describe('OfflineBootstrap', () => {
  const dispose = vi.fn()

  beforeEach(() => {
    mocks.setupOffline.mockReset()
    dispose.mockReset()
    mocks.setupOffline.mockReturnValue(dispose)
  })

  it('no arranca la cola sin sesión', async () => {
    renderBootstrap('signed-out')

    await act(async () => {
      await Promise.resolve()
    })

    expect(mocks.setupOffline).not.toHaveBeenCalled()
  })

  it('no arranca la cola mientras se resuelve la sesión', async () => {
    renderBootstrap('loading')

    await act(async () => {
      await Promise.resolve()
    })

    expect(mocks.setupOffline).not.toHaveBeenCalled()
  })

  it('arranca con sesión y se detiene al cerrarla', async () => {
    const { rerender } = renderBootstrap('signed-in')

    await waitFor(() => {
      expect(mocks.setupOffline).toHaveBeenCalledTimes(1)
    })

    rerender(
      <AuthContext.Provider value={makeAuth('signed-out')}>
        <OfflineBootstrap />
      </AuthContext.Provider>,
    )

    await waitFor(() => {
      expect(dispose).toHaveBeenCalledTimes(1)
    })
  })
})
