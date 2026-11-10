import { AppError } from '../http/errors.js'

/** Valida una zona IANA con la base de datos de Intl del runtime. */
export function assertTimeZone(value: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
  } catch {
    throw new AppError(400, 'invalid_timezone', 'La zona horaria no es válida')
  }
}
