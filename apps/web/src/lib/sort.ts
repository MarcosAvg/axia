// Orden de listas en cliente: pura, sin React ni Supabase.

type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: string
  dir: SortDirection
}

/** Alterna el orden de una columna; un clic en otra empieza ascendente. */
export function nextSort(current: SortState | null, key: string): SortState {
  if (!current || current.key !== key) return { key, dir: 'asc' }
  return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
}

function normalize(value: unknown): number | string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value ? 1 : 0
  return String(value).toLocaleLowerCase('es-MX')
}

/** Compara dos valores; los vacíos quedan al final; números y texto natural. */
export function compareValues(a: unknown, b: unknown): number {
  const left = normalize(a)
  const right = normalize(b)
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  if (typeof left === 'number' && typeof right === 'number') return left - right
  return String(left).localeCompare(String(right), 'es-MX', { numeric: true })
}

/** Copia ordenada por la columna indicada (los vacíos siempre al final). */
export function sortRows<T>(rows: T[], sort: SortState | null): T[] {
  if (!sort) return rows
  const factor = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = normalize((a as Record<string, unknown>)[sort.key])
    const right = normalize((b as Record<string, unknown>)[sort.key])
    if (left === null || right === null) {
      if (left === null && right === null) return 0
      return left === null ? 1 : -1
    }
    const base =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), 'es-MX', { numeric: true })
    return base * factor
  })
}
