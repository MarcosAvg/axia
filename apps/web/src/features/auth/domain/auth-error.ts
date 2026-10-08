// Funciones puras para interpretar errores de autenticación (sin depender de Supabase).

interface AuthErrorLike {
  message?: string
  status?: number
  code?: string
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
