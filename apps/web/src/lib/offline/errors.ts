/** Error de un elemento de la cola con un código de dominio para la UI. */
export class OutboxError extends Error {
  readonly code?: string

  readonly serverState?: string

  constructor(message: string, code?: string, serverState?: string) {
    super(message)
    this.name = 'OutboxError'
    this.code = code
    this.serverState = serverState
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
  if (error instanceof DOMException && error.name === 'TimeoutError')
    return true
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(
    messageOf(error),
  )
}

export function isRetryableOutboxError(error: unknown): boolean {
  if (isNetworkError(error)) return true
  if (error instanceof OutboxError) return error.code === 'internal_error'
  if (typeof error !== 'object' || error === null) return false
  const status = Reflect.get(error, 'status')
  return (
    typeof status === 'number' &&
    (status === 423 || status === 429 || [500, 502, 503, 504].includes(status))
  )
}
