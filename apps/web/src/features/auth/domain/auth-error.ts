// Funciones puras para interpretar errores de autenticación (sin depender de el cliente HTTP).

interface AuthErrorLike {
  message?: string
  status?: number
  code?: string
  details?: unknown
}

function asAuthError(error: unknown): AuthErrorLike | null {
  if (typeof error !== 'object' || error === null) return null
  return error as AuthErrorLike
}

/** Verdadero si el error corresponde a credenciales inválidas. */
export function isInvalidCredentials(error: unknown): boolean {
  const parsed = asAuthError(error)
  if (!parsed) return false
  if (parsed.code === 'invalid_credentials') return true
  if (parsed.status === 400) return true
  return parsed.message?.toLowerCase().includes('invalid') ?? false
}

/** Segundos de espera si la cuenta está bloqueada por intentos fallidos. */
export function lockoutSeconds(error: unknown): number | null {
  const parsed = asAuthError(error)
  if (!parsed || parsed.code !== 'account_locked') return null
  if (typeof parsed.details !== 'object' || parsed.details === null) {
    return null
  }
  const value = (parsed.details as { retryAfterSeconds?: unknown })
    .retryAfterSeconds
  return typeof value === 'number' && value > 0 ? value : null
}

/** Minutos visibles para el bloqueo, redondeando hacia arriba. */
export function lockoutMinutes(error: unknown): number | null {
  const seconds = lockoutSeconds(error)
  return seconds === null ? null : Math.max(1, Math.ceil(seconds / 60))
}
