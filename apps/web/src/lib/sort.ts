// Orden de listas en cliente: pura, sin React ni el cliente HTTP.

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

/** Compara dos valores aplicando la dirección; los vacíos siempre al final. */
export function compareWith(
  a: unknown,
  b: unknown,
  dir: SortDirection,
): number {
  const left = normalize(a)
  const right = normalize(b)
  if (left === null || right === null) return compareValues(a, b)
  return compareValues(a, b) * (dir === 'asc' ? 1 : -1)
}

/** Copia ordenada por la columna indicada (los vacíos siempre al final). */
export function sortRows<T>(
  rows: T[],
  sort: SortState | null,
  valueOf?: (row: T, key: string) => unknown,
): T[] {
  if (!sort) return rows
  const valueFor = (row: T): unknown =>
    valueOf
      ? valueOf(row, sort.key)
      : (row as Record<string, unknown>)[sort.key]
  return [...rows].sort((a, b) =>
    compareWith(valueFor(a), valueFor(b), sort.dir),
  )
}
