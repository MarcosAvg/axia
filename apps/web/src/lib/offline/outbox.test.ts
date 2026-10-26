import 'fake-indexeddb/auto'
import { db } from './db'
import {
  discardOutboxItem,
  enqueue,
  errorsForCurrentUser,
  processOutbox,
  registerOutboxHandler,
  retryOutboxItem,
} from './outbox'
import { setOfflineUserId } from './user'

beforeEach(async () => {
  await db.outbox.clear()
  setOfflineUserId('user-a')
})

afterAll(() => {
  db.close()
  setOfflineUserId(null)
})

describe('procesamiento de la cola', () => {
  it('procesa y elimina un ítem correcto', async () => {
    let handled = 0
    registerOutboxHandler('test_ok', async () => {
      handled += 1
    })
    await enqueue('test_ok', { value: 1 })

    await processOutbox()

    expect(handled).toBe(1)
    expect(await db.outbox.count()).toBe(0)
  })

  it('reintenta un ítem que falla por red', async () => {
    registerOutboxHandler('test_fail', async () => {
      throw new TypeError('Failed to fetch')
    })
    await enqueue('test_fail', {})

    await processOutbox()

    const items = await db.outbox.toArray()
    expect(items).toHaveLength(1)
    expect(items[0]?.state).toBe('pending')
    expect(items[0]?.attempts).toBe(1)
  })

  it('no reintenta un error de dominio', async () => {
    let calls = 0
    registerOutboxHandler('test_domain', async () => {
      calls += 1
      throw new Error('El tiquet ya cambió')
    })
    await enqueue('test_domain', {})

    await processOutbox()
    await processOutbox()

    const items = await db.outbox.toArray()
    expect(calls).toBe(1)
    expect(items).toHaveLength(1)
    expect(items[0]?.state).toBe('error')
    expect(items[0]?.attempts).toBe(1)
    expect(items[0]?.lastError).toBe('El tiquet ya cambió')
  })
})

describe('errores definitivos', () => {
  it('lista, reintenta y descarta los errores del usuario actual', async () => {
    registerOutboxHandler('test_retry', async () => {
      throw new Error('fallo definitivo')
    })
    await enqueue('test_retry', {})
    await processOutbox()

    const [failed] = await errorsForCurrentUser()
    expect(failed?.lastError).toBe('fallo definitivo')

    registerOutboxHandler('test_retry', async () => {})
    await retryOutboxItem(failed!.id)
    expect((await db.outbox.get(failed!.id))?.state).toBe('pending')
    await processOutbox()
    expect(await db.outbox.count()).toBe(0)

    const discard = vi.fn(async () => {})
    registerOutboxHandler(
      'test_discard',
      async () => {
        throw new Error('no se puede')
      },
      discard,
    )
    await enqueue('test_discard', { evidenceId: 'local-1' })
    await processOutbox()
    const [toDiscard] = await errorsForCurrentUser()
    await discardOutboxItem(toDiscard!.id)
    expect(discard).toHaveBeenCalledWith({ evidenceId: 'local-1' })
    expect(await db.outbox.count()).toBe(0)
  })

  it('no toca los errores de otra persona', async () => {
    registerOutboxHandler('test_error_owner', async () => {
      throw new Error('ajeno')
    })
    await enqueue('test_error_owner', {})
    await processOutbox()
    const [failed] = await errorsForCurrentUser()

    setOfflineUserId('user-b')
    expect(await errorsForCurrentUser()).toEqual([])
    await retryOutboxItem(failed!.id)
    await discardOutboxItem(failed!.id)
    expect((await db.outbox.get(failed!.id))?.state).toBe('error')
  })
})

describe('propietario de la cola', () => {
  it('no envía la cola de otra persona', async () => {
    const handled = vi.fn(async () => {})
    registerOutboxHandler('test_owner', handled)
    await enqueue('test_owner', {})

    setOfflineUserId('user-b')
    await processOutbox()

    expect(handled).not.toHaveBeenCalled()
    expect(await db.outbox.count()).toBe(1)

    setOfflineUserId('user-a')
    await processOutbox()

    expect(handled).toHaveBeenCalledTimes(1)
    expect(await db.outbox.count()).toBe(0)
  })
})
