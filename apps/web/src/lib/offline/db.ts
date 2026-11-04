import Dexie, { type EntityTable } from 'dexie'

// Cola de salida: toda acción que pueda ocurrir sin conexión se guarda aquí
// primero, con un UUID generado en el cliente (`crypto.randomUUID()`). El servidor
// usa ese UUID como clave de idempotencia (`client_request_id`).
// Ver docs/concepts/arquitectura.md para el contrato offline actual.
export interface OutboxItem {
  id: string
  // Secuencia monótona (sin índice): da un orden determinista al procesar la cola, para que
  // la evidencia "antes" se suba antes que la acción de iniciar.
  seq: number
  type: string
  /** Dueño del elemento; nunca se reenvía con la sesión de otra persona. */
  userId?: string
  payload: unknown
  /** Operaciones con la misma clave dependen de las anteriores (un tiquet). */
  orderingKey?: string
  state: 'pending' | 'sending' | 'error'
  attempts: number
  lastError: string | null
  /** Marca de tiempo del último intento, para recuperar envíos interrumpidos. */
  sendingAt?: number | null
  createdAt: number
}

// Foto ya comprimida, guardada en el dispositivo hasta que termine de subirse.
export interface Evidence {
  id: string
  /** Dueño de la foto; otra persona en el mismo dispositivo no la ve. */
  userId?: string
  ticketId: string
  cycle: number
  type: string
  blob: Blob
  mimeType: string
  fileName: string
  /** Nota opcional (por ejemplo, el avance al registrar `during`). */
  note?: string | null
  /** Hora real de la evidencia, si quien la sube puede ajustarla. */
  occurredAt?: string
  /** Técnico proxy al que se atribuye la evidencia. */
  subjectTechnicianId?: string
  state: 'pending' | 'uploading' | 'uploaded' | 'error'
  /** Porcentaje de subida (0–100). */
  progress: number
  createdAt: number
}

/** Caché serializada de React Query para abrir datos ya vistos sin conexión. */
export interface QueryCacheEntry {
  key: string
  value: unknown
}

export const db = new Dexie('axia') as Dexie & {
  outbox: EntityTable<OutboxItem, 'id'>
  evidences: EntityTable<Evidence, 'id'>
  queryCache: EntityTable<QueryCacheEntry, 'key'>
}

db.version(1).stores({
  outbox: 'id, type, state, createdAt',
  evidences: 'id, ticketId, state',
})

db.version(2).stores({
  outbox: 'id, type, state, createdAt',
  evidences: 'id, ticketId, state',
  queryCache: 'key',
})
