import 'fake-indexeddb/auto'
import { db } from './db'

function outboxItem() {
  return {
    id: crypto.randomUUID(),
    seq: 1,
    type: 'ticket-start',
    payload: { ticketId: 'ticket-1' },
    state: 'pending' as const,
    attempts: 0,
    lastError: null,
    createdAt: Date.now(),
  }
}

describe('base local (Dexie)', () => {
  beforeEach(async () => {
    await db.outbox.clear()
    await db.evidences.clear()
  })

  afterAll(() => {
    db.close()
  })

  it('guarda y lee un elemento de la cola de salida', async () => {
    const item = outboxItem()
    const id = await db.outbox.add(item)

    const stored = await db.outbox.get(id)
    expect(stored).toMatchObject({
      type: 'ticket-start',
      state: 'pending',
      attempts: 0,
    })
  })

  it('lista los elementos pendientes ordenados por creación', async () => {
    const first = { ...outboxItem(), createdAt: 1000 }
    const second = { ...outboxItem(), createdAt: 2000 }
    await db.outbox.bulkAdd([second, first])

    const pending = await db.outbox
      .where('state')
      .equals('pending')
      .sortBy('createdAt')

    expect(pending.map((item) => item.createdAt)).toEqual([1000, 2000])
  })

  it('guarda y lee una evidencia', async () => {
    const id = crypto.randomUUID()
    // Nota: fake-indexeddb no conserva el contenido de un Blob al leerlo (lo
    // devuelve como objeto vacío); en un navegador real IndexedDB sí guarda el
    // Blob. Aquí solo se verifica que el registro sobrevive la ronda.
    const blob = new Blob(['foto'], { type: 'image/jpeg' })
    await db.evidences.add({
      id,
      ticketId: 'ticket-1',
      cycle: 1,
      type: 'before',
      blob,
      mimeType: 'image/jpeg',
      fileName: 'foto.jpg',
      state: 'pending',
      progress: 0,
      createdAt: Date.now(),
    })

    const stored = await db.evidences.get(id)
    expect(stored?.id).toBe(id)
    expect(stored?.ticketId).toBe('ticket-1')
    expect(stored?.state).toBe('pending')
  })
})
