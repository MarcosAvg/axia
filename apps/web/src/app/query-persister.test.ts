import 'fake-indexeddb/auto'
import type { PersistedClient } from '@tanstack/react-query-persist-client'

import { db } from '@/lib/offline/db'
import { setOfflineUserId } from '@/lib/offline/user'
import {
  clearPersistedQueries,
  queryCacheOwner,
  queryPersister,
  shouldPersistQuery,
} from './query-persister'

const client = {
  timestamp: 1,
  buster: 'test',
  clientState: { mutations: [], queries: [] },
} satisfies PersistedClient

beforeEach(async () => {
  window.localStorage.clear()
  await db.queryCache.clear()
  setOfflineUserId('user-a')
})

afterAll(() => {
  setOfflineUserId(null)
  db.close()
})

describe('persistencia de React Query', () => {
  it('guarda, restaura y elimina el cliente', async () => {
    await queryPersister.persistClient(client)
    expect(await queryPersister.restoreClient()).toEqual(client)
    expect(queryCacheOwner()).toBe('user-a')

    await queryPersister.removeClient()
    expect(await queryPersister.restoreClient()).toBeUndefined()
    expect(queryCacheOwner()).toBeNull()
  })

  it('descarta el caché si falta el dueño', async () => {
    await queryPersister.persistClient(client)
    window.localStorage.removeItem('axia.offline.queryCacheUser')
    expect(await queryPersister.restoreClient()).toBeUndefined()
    expect(await db.queryCache.count()).toBe(0)
  })

  it('limpia el caché persistido', async () => {
    await queryPersister.persistClient(client)
    await clearPersistedQueries()
    expect(await queryPersister.restoreClient()).toBeUndefined()
    expect(queryCacheOwner()).toBeNull()
  })

  it('solo persiste tiquets, catálogos e identidad', () => {
    const success = (queryKey: readonly unknown[]) => ({
      queryKey,
      state: { status: 'success' },
    })
    expect(shouldPersistQuery(success(['tickets', 'detail', 't1']))).toBe(true)
    expect(shouldPersistQuery(success(['catalogs', 'buildings', '']))).toBe(
      true,
    )
    expect(shouldPersistQuery(success(['auth', 'identity', 'u1']))).toBe(true)
    expect(shouldPersistQuery(success(['notifications']))).toBe(false)
    expect(shouldPersistQuery(success(['metrics', 'summary']))).toBe(false)
    expect(shouldPersistQuery(success(['admin', 'catalogs']))).toBe(false)
    expect(shouldPersistQuery(success(['evidence', 'url', 'e1']))).toBe(false)
    expect(
      shouldPersistQuery({
        queryKey: ['tickets', 'detail', 't1'],
        state: { status: 'pending' },
      }),
    ).toBe(false)
  })
})

it('solo considera disponibles detalles vigentes y persistidos para el usuario', async () => {
  const { readyTicketDetails } = await import('./query-persister')
  const { QueryClient, dehydrate } = await import('@tanstack/react-query')
  const { QUERY_CACHE_BUSTER, OFFLINE_CACHE_TTL_MS } =
    await import('@/lib/offline/cache-policy')
  const queryClient = new QueryClient()
  const now = Date.now()
  queryClient.setQueryData(
    ['tickets', 'detail', 'ready'],
    { id: 'ready' },
    { updatedAt: now },
  )
  queryClient.setQueryData(
    ['tickets', 'detail', 'old'],
    { id: 'old' },
    { updatedAt: now - OFFLINE_CACHE_TTL_MS - 1 },
  )
  queryClient.setQueryData(['tickets', 'detail', 'missing'], null)
  expect(await readyTicketDetails('user-a', now)).toEqual(new Map())
  await queryPersister.persistClient({
    buster: QUERY_CACHE_BUSTER,
    timestamp: now,
    clientState: dehydrate(queryClient),
  })
  expect(await readyTicketDetails('user-a', now)).toEqual(
    new Map([['ready', now]]),
  )
  window.localStorage.setItem('axia.offline.queryCacheUser', 'user-b')
  expect(await readyTicketDetails('user-b', now)).toEqual(new Map())
  expect(await queryPersister.restoreClient()).toBeUndefined()
  window.localStorage.setItem('axia.offline.queryCacheUser', 'user-a')
  expect(
    await readyTicketDetails('user-a', now + OFFLINE_CACHE_TTL_MS + 1),
  ).toEqual(new Map())
  const pauseReasonsKey = ['catalogs', 'reasons', 'pause']
  const required = [pauseReasonsKey]
  expect(await readyTicketDetails('user-a', now, required)).toEqual(new Map())
  queryClient.setQueryData(pauseReasonsKey, [])
  await queryPersister.persistClient({
    buster: QUERY_CACHE_BUSTER,
    timestamp: now,
    clientState: dehydrate(queryClient),
  })
  expect(await readyTicketDetails('user-a', now, required)).toEqual(
    new Map([['ready', now]]),
  )
  queryClient.clear()
})

it('requiere el subestado vigente para preparar un tiquet pausado', async () => {
  const { readyTicketDetails } = await import('./query-persister')
  const { QueryClient, dehydrate } = await import('@tanstack/react-query')
  const { QUERY_CACHE_BUSTER } = await import('@/lib/offline/cache-policy')
  const queryClient = new QueryClient()
  const now = Date.now()
  queryClient.setQueryData(
    ['tickets', 'detail', 'paused'],
    { status: 'paused' },
    { updatedAt: now },
  )
  const persist = () =>
    queryPersister.persistClient({
      buster: QUERY_CACHE_BUSTER,
      timestamp: now,
      clientState: dehydrate(queryClient),
    })
  await persist()
  expect(await readyTicketDetails('user-a', now)).toEqual(new Map())
  queryClient.setQueryData(['tickets', 'pause-state', 'paused'], {
    currentId: 'step',
  })
  await persist()
  expect(await readyTicketDetails('user-a', now)).toEqual(
    new Map([['paused', now]]),
  )
  queryClient.clear()
})

it('rechaza un guardado de la pestaña anterior después de cambiar de cuenta', async () => {
  await queryPersister.persistClient(client)
  localStorage.setItem('axia.offline.userId', 'user-b')
  await queryPersister.persistClient({ ...client, timestamp: 2 })
  expect(queryCacheOwner()).toBe('user-a')
  expect(await queryPersister.restoreClient()).toEqual(client)
})

it('conserva la última copia únicamente ante un error transitorio', () => {
  const queryKey = ['tickets', 'detail', 'ticket']
  const data = { description: 'Detalle guardado' }
  expect(
    shouldPersistQuery({
      queryKey,
      state: { status: 'error', data, error: new TypeError('Failed to fetch') },
    }),
  ).toBe(true)
  expect(
    shouldPersistQuery({
      queryKey,
      state: { status: 'error', data, error: { status: 403 } },
    }),
  ).toBe(false)
})

it('revalida las copias de una versión anterior y conserva su lectura offline', async () => {
  const { readyTicketDetails } = await import('./query-persister')
  const { QueryClient, dehydrate } = await import('@tanstack/react-query')
  const { QUERY_CACHE_BUSTER } = await import('@/lib/offline/cache-policy')
  const queryClient = new QueryClient()
  const now = Date.now()
  queryClient.setQueryData(
    ['tickets', 'detail', 't1'],
    { id: 't1' },
    { updatedAt: now },
  )
  await queryPersister.persistClient({
    timestamp: now,
    buster: QUERY_CACHE_BUSTER,
    clientState: dehydrate(queryClient),
  })
  await db.queryCache.update('query-cache', { webBuild: 'previous-build' })

  expect(
    (await queryPersister.restoreClient())?.clientState.queries[0]?.state,
  ).toMatchObject({ data: { id: 't1' }, isInvalidated: true })
  expect(await readyTicketDetails('user-a', now)).toEqual(
    new Map([['t1', now]]),
  )
  expect(await readyTicketDetails('user-a', now, [], { fresh: true })).toEqual(
    new Map(),
  )
  queryClient.clear()
})
