import type { AdminRow } from '../api/admin-api'

/** Nombre legible de una fila por su id (para columnas referenciadas). */
export function nameById(rows: AdminRow[] | undefined, id: string): string {
  const found = rows?.find((row) => String(row.id) === id)
  return found ? String(found.name ?? '—') : '—'
}
