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
