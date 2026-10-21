import Dexie, { type EntityTable } from 'dexie'

// Cola de salida: toda acción que pueda ocurrir sin conexión se guarda aquí
// primero, con un UUID generado en el cliente (`crypto.randomUUID()`). La función
// en Postgres usa ese UUID como clave de idempotencia (`client_request_id`).
// Ver docs/decisions/0004-cola-offline-con-dexie.md.
export interface OutboxItem {
  id: string
  // Secuencia monótona (sin índice): da un orden determinista al procesar la cola, para que
  // la evidencia "antes" se suba antes que la acción de iniciar.
  seq: number
  type: string
  payload: unknown
  state: 'pending' | 'sending' | 'error' | 'blocked'
  attempts: number
  lastError: string | null
  result?: unknown
  createdAt: number
}

// Foto ya comprimida, guardada en el dispositivo hasta que termine de subirse.
export interface Evidence {
  id: string
  ticketId: string
  cycle: number
  type: string
  blob: Blob
  mimeType: string
  fileName: string
  /** Nota opcional (por ejemplo, el avance al registrar `during`). */
  note?: string | null
  state: 'pending' | 'uploading' | 'uploaded' | 'error'
  /** Porcentaje de subida (0–100). */
  progress: number
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
