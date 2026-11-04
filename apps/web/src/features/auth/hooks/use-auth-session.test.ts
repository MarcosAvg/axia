import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSession } from '../api/auth-api'
import type { AuthSession } from '../api/auth-api'
import type { Identity } from '../domain/identity'
import { readCachedAuth, writeCachedAuth } from '../offline-session'
import { useAuthSession } from './use-auth-session'

vi.mock('../api/auth-api', () => ({ getSession: vi.fn() }))

const session: AuthSession = {
  user: { id: 'user-a', username: 'ana', fullName: 'Ana Pérez' },
}

const identity: Identity = {
  userId: 'user-a',
  fullName: 'Ana Pérez',
  phone: null,
  active: true,
  roles: ['requester'],
  permissions: [{ permission: 'ticket.view', scope: 'all' }],
  technicianId: null,
  timezone: 'America/Mexico_City',
  mustChangePassword: false,
}

beforeEach(() => {
  window.localStorage.clear()
  vi.mocked(getSession).mockReset()
})

describe('useAuthSession', () => {
  it('usa la sesión del servidor cuando hay red', async () => {
    vi.mocked(getSession).mockResolvedValue(session)
    const { result } = renderHook(() => useAuthSession())

    await waitFor(() => expect(result.current.status).toBe('signed-in'))
    expect(result.current.session).toEqual(session)
    expect(result.current.isOfflineSession).toBe(false)
  })

  it('restaura la sesión cacheada si falla la red', async () => {
    writeCachedAuth(session, identity)
    vi.mocked(getSession).mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useAuthSession())

    await waitFor(() => expect(result.current.status).toBe('signed-in'))
    expect(result.current.session).toEqual(session)
    expect(result.current.isOfflineSession).toBe(true)
  })

  it('cierra sesión si falla la red y no hay caché', async () => {
    vi.mocked(getSession).mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useAuthSession())

    await waitFor(() => expect(result.current.status).toBe('signed-out'))
    expect(result.current.session).toBeNull()
    expect(result.current.isOfflineSession).toBe(false)
  })

  it('borra la caché cuando el servidor responde sin sesión', async () => {
    writeCachedAuth(session, identity)
    vi.mocked(getSession).mockResolvedValue(null)
    const { result } = renderHook(() => useAuthSession())

    await waitFor(() => expect(result.current.status).toBe('signed-out'))
    expect(readCachedAuth()).toBeNull()
  })

  it('revalida al recuperar la conexión', async () => {
    writeCachedAuth(session, identity)
    vi.mocked(getSession)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(session)
    const { result } = renderHook(() => useAuthSession())

    await waitFor(() => expect(result.current.isOfflineSession).toBe(true))
    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() => expect(result.current.isOfflineSession).toBe(false))
    expect(result.current.session).toEqual(session)
  })
})
