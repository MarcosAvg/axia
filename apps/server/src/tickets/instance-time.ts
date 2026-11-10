import { sql } from 'drizzle-orm'

import { AppError } from '../http/errors.js'
import type { DbExecutor } from './db.js'

export const INSTANCE_WALL_CLOCK = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

type SettingsRow = {
  timezone: string
}

async function settings(db: DbExecutor): Promise<SettingsRow> {
  const result = await db.execute(sql`
    select timezone from public.instance_settings limit 1
  `)
  const row = result.rows[0] as SettingsRow | undefined
  if (!row) {
    throw new AppError(
      500,
      'config',
      'La instancia no tiene una zona horaria configurada',
    )
  }
  return row
}

/**
 * Convierte una hora de pared `YYYY-MM-DDTHH:mm` de la zona de la instancia
 * en un instante. Rechaza horas inexistentes en el cambio de horario.
 */
export async function parseInstanceWallClock(
  db: DbExecutor,
  value: string,
): Promise<Date> {
  if (!INSTANCE_WALL_CLOCK.test(value)) {
    throw new AppError(
      400,
      'validation',
      'La hora debe tener el formato AAAA-MM-DDTHH:mm',
    )
  }
  const { timezone } = await settings(db)
  const result = await db.execute(sql`
    select
      (${value}::timestamp at time zone ${timezone}) as occurred_at,
      to_char(
        (${value}::timestamp at time zone ${timezone}) at time zone ${timezone},
        'YYYY-MM-DD"T"HH24:MI'
      ) as local_text
  `)
  const row = result.rows[0] as
    { occurred_at: Date | string; local_text: string } | undefined
  if (!row) {
    throw new AppError(400, 'validation', 'La hora no es válida')
  }
  if (row.local_text !== value) {
    throw new AppError(
      400,
      'validation',
      'La hora no existe en la zona horaria de la instancia',
    )
  }
  return new Date(row.occurred_at)
}
