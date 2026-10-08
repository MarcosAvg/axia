function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null) {
    const value = Reflect.get(error, 'message')
    if (typeof value === 'string') return value
  }
  return String(error)
}

/** Verdadero si el error parece de red (se reintenta); falso para errores de dominio. */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(
    messageOf(error),
  )
}
