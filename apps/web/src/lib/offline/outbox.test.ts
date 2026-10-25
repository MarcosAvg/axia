import 'fake-indexeddb/auto'
import { db } from './db'
import { enqueue, processOutbox, registerOutboxHandler } from './outbox'
import { setOfflineUserId } from './user'

describe('cola de salida (outbox)', () => {
  beforeEach(async () => {
    await db.outbox.clear()
    setOfflineUserId('user-a')
  })

  afterAll(() => {
    db.close()
    setOfflineUserId(null)
  })

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
