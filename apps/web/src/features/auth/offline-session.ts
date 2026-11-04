import { OFFLINE_CACHE_TTL_MS } from '@/lib/offline/cache-policy'
import type { AuthSession } from './api/auth-api'
import type { Identity } from './domain/identity'

const STORAGE_KEY = 'axia.offline.auth'

/** Ventana máxima para abrir la app sin poder validar la sesión contra el servidor. */
export const OFFLINE_AUTH_TTL_MS = OFFLINE_CACHE_TTL_MS

export type CachedAuth = {
  session: AuthSession
  identity: Identity
  cachedAt: number
}

function storage(): Storage | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage
  } catch {
    return null
  }
}

/** Sesión e identidad válidas para arrancar sin red; `null` si faltan o expiraron. */
export function readCachedAuth(now = Date.now()): CachedAuth | null {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CachedAuth>
    if (!parsed.session || !parsed.identity || !parsed.cachedAt) {
      clearCachedAuth()
      return null
    }
    if (now - parsed.cachedAt > OFFLINE_AUTH_TTL_MS) {
      clearCachedAuth()
      return null
    }
    return parsed as CachedAuth
  } catch {
    clearCachedAuth()
    return null
  }
}

/** Guarda la última sesión validada con su identidad para el arranque sin red. */
export function writeCachedAuth(
  session: AuthSession,
  identity: Identity,
): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(
      STORAGE_KEY,
      JSON.stringify({ session, identity, cachedAt: Date.now() }),
    )
  } catch {
    // Almacenamiento bloqueado: el arranque offline no estará disponible.
  }
}

/** Identidad cacheada solo si pertenece al usuario de la sesión actual. */
export function readCachedIdentity(userId: string): Identity | null {
  const cached = readCachedAuth()
  return cached?.session.user.id === userId ? cached.identity : null
}

export function clearCachedAuth(): void {
  const store = storage()
  if (!store) return
  try {
    store.removeItem(STORAGE_KEY)
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}
