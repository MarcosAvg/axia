import { sql } from 'drizzle-orm'

import { AppError } from '../http/errors.js'
import type { DbExecutor } from './db.js'

function invalid(message: string): AppError {
  return new AppError(400, 'validation_error', message)
}

export async function requirePauseRoot(
  tx: DbExecutor,
  reasonId: string,
): Promise<void> {
  const result = await tx.execute(sql`
    select id
    from public.reasons
    where id = ${reasonId}
      and active
      and use = 'pause'
      and parent_id is null
    limit 1
  `)
  if (!result.rows[0]) {
    throw invalid('El motivo de pausa no es válido')
  }
}

export async function requirePauseDescendant(
  tx: DbExecutor,
  rootReasonId: string,
  reasonId: string,
): Promise<void> {
  if (rootReasonId === reasonId) {
    throw invalid('Indica un subestado de la pausa')
  }
  const result = await tx.execute(sql`
    with recursive ancestors as (
      select id, parent_id
      from public.reasons
      where id = ${reasonId} and active and use = 'pause'
      union all
      select r.id, r.parent_id
      from public.reasons r
      join ancestors a on r.id = a.parent_id
    )
    select exists (
      select 1 from ancestors where id = ${rootReasonId}
    ) as valid
  `)
  if (!(result.rows[0] as { valid: boolean } | undefined)?.valid) {
    throw invalid('El subestado no pertenece al motivo de la pausa')
  }
}
