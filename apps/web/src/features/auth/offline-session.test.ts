import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthSession } from './api/auth-api'
import type { Identity } from './domain/identity'
import {
  OFFLINE_AUTH_TTL_MS,
  clearCachedAuth,
  readCachedAuth,
  readCachedIdentity,
  writeCachedAuth,
} from './offline-session'

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
})

describe('caché de sesión offline', () => {
  it('guarda y recupera sesión e identidad', () => {
    writeCachedAuth(session, identity)
    expect(readCachedAuth()).toMatchObject({ session, identity })
    expect(readCachedIdentity('user-a')).toEqual(identity)
  })

  it('no mezcla la identidad de otro usuario', () => {
    writeCachedAuth(session, identity)
    expect(readCachedIdentity('user-b')).toBeNull()
  })

  it('descarta la caché expirada', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      writeCachedAuth(session, identity)
      vi.setSystemTime(new Date(Date.now() + OFFLINE_AUTH_TTL_MS + 1))
      expect(readCachedAuth()).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('limpia la caché corrupta', () => {
    window.localStorage.setItem('axia.offline.auth', '{no-json')
    expect(readCachedAuth()).toBeNull()
    expect(window.localStorage.getItem('axia.offline.auth')).toBeNull()
  })

  it('borra la caché explícitamente', () => {
    writeCachedAuth(session, identity)
    clearCachedAuth()
    expect(readCachedAuth()).toBeNull()
  })
})
