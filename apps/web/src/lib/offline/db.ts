import Dexie, { type EntityTable } from 'dexie'

// Cola de salida: toda acción que pueda ocurrir sin conexión se guarda aquí
// primero, con un UUID generado en el cliente (`crypto.randomUUID()`). La función
// en Postgres usa ese UUID como clave de idempotencia (`client_request_id`).
// Ver docs/decisions/0004-cola-offline-con-dexie.md.
export interface OutboxItem {
  id: string
  type: string
  payload: unknown
  state: 'pending' | 'sending' | 'error'
  attempts: number
  createdAt: number
}

// Foto ya comprimida, guardada en el dispositivo hasta que termine de subirse.
export interface Evidence {
  id: string
  ticketId: string
  blob: Blob
  state: 'pending' | 'uploading' | 'uploaded' | 'error'
  createdAt: number
}

export const db = new Dexie('axia') as Dexie & {
  outbox: EntityTable<OutboxItem, 'id'>
  evidences: EntityTable<Evidence, 'id'>
}

db.version(1).stores({
  outbox: 'id, type, state, createdAt',
  evidences: 'id, ticketId, state',
})
