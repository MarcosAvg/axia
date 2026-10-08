import { ticketMessages } from '../i18n'

type TicketErrorKind =
  | 'permission'
  | 'invalid-state'
  | 'conflict'
  | 'validation'
  | 'not-found'
  | 'unknown'

export interface TicketError {
  kind: TicketErrorKind
  message: string
}

function codeOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

/** Convierte un error de Postgres/Supabase en un error de dominio con mensaje claro. */
export function toTicketError(error: unknown): TicketError {
  switch (codeOf(error)) {
    case '42501':
      return { kind: 'permission', message: ticketMessages.errors.permission }
    case 'P0001':
      return {
        kind: 'invalid-state',
        message: ticketMessages.errors.invalidState,
      }
    case '23505':
      return { kind: 'conflict', message: ticketMessages.errors.conflict }
    case '22023':
      return { kind: 'validation', message: ticketMessages.errors.validation }
    case 'P0002':
      return { kind: 'not-found', message: ticketMessages.errors.notFound }
    default:
      return { kind: 'unknown', message: ticketMessages.errors.unknown }
  }
}
