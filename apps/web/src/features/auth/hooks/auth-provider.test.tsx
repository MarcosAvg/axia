import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchIdentity } from '../api/auth-api'
import { readCachedAuth } from '../offline-session'
import { AuthProvider } from './auth-provider'
import { useAuth } from './auth-context'

const mocks = vi.hoisted(() => ({
  session: {
    user: { id: 'user-a', username: 'ana', fullName: 'Ana Pérez' },
  },
  identity: {
    userId: 'user-a',
    fullName: 'Ana Pérez',
    phone: null,
    active: true,
    roles: ['requester'],
    permissions: [{ permission: 'ticket.view', scope: 'all' as const }],
    technicianId: null,
    timezone: 'America/Mexico_City',
    mustChangePassword: false,
  },
  refresh: vi.fn(),
}))

vi.mock('./use-auth-session', () => ({
  useAuthSession: () => ({
    status: 'signed-in',
    session: mocks.session,
    isOfflineSession: false,
    refresh: mocks.refresh,
  }),
}))
vi.mock('../api/auth-api', () => ({
  fetchIdentity: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}))

function Probe() {
  const { identity } = useAuth()
  return <p>{identity?.fullName ?? 'sin identidad'}</p>
}

beforeEach(() => {
  window.localStorage.clear()
  vi.mocked(fetchIdentity).mockReset()
  vi.mocked(fetchIdentity).mockResolvedValue(mocks.identity)
})

describe('AuthProvider', () => {
  it('guarda sesión e identidad cuando la identidad llega del servidor', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Ana Pérez')).toBeVisible()
    await waitFor(() => {
      expect(readCachedAuth()).toMatchObject({
        session: mocks.session,
        identity: mocks.identity,
      })
    })
  })
})
