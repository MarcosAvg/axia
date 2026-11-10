/** Error de un elemento de la cola con un código de dominio para la UI. */
export class OutboxError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'OutboxError'
    this.code = code
  }
}

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
