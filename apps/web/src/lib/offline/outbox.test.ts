import 'fake-indexeddb/auto'
import { db } from './db'
import { enqueue, processOutbox, registerOutboxHandler } from './outbox'

describe('cola de salida (outbox)', () => {
  beforeEach(async () => {
    await db.outbox.clear()
  })

  afterAll(() => {
    db.close()
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
    registerOutboxHandler('test_domain', async () => {
      throw new Error('El tiquet ya cambió')
    })
    await enqueue('test_domain', {})

    await processOutbox()

    const items = await db.outbox.toArray()
    expect(items).toHaveLength(1)
    expect(items[0]?.state).toBe('error')
    expect(items[0]?.attempts).toBe(1)
    expect(items[0]?.lastError).toBe('El tiquet ya cambió')
  })
})
