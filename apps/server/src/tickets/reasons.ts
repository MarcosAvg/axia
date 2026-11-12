import { sql } from 'drizzle-orm'

import { AppError } from '../http/errors.js'
import type { DbExecutor } from './db.js'

function invalid(message: string): AppError {
  return new AppError(400, 'validation_error', message)
}

async function requirePauseTarget(
  tx: DbExecutor,
  currentReasonId: string,
  reasonId: string,
  kind: 'progress' | 'exit',
): Promise<void> {
  if (currentReasonId === reasonId) {
    throw invalid(
      kind === 'progress'
        ? 'Indica un subestado siguiente distinto del actual'
        : 'Indica una salida distinta del subestado actual',
    )
  }
  const result = await tx.execute(sql`
    select 1
    from public.pause_transitions t
    join public.reasons source on source.id = t.from_reason_id
    join public.reasons target on target.id = t.to_reason_id
    where t.from_reason_id = ${currentReasonId}
      and t.to_reason_id = ${reasonId}
      and source.use = 'pause'
      and target.use = 'pause'
      and target.active
      and target.parent_id is not null
      and target.pause_step_kind = ${kind}::public.pause_step_kind
    limit 1
  `)
  if (!result.rows[0]) {
    throw invalid(
      kind === 'progress'
        ? 'El destino no es un siguiente paso del subestado actual'
        : 'El destino no es una salida habilitada para el subestado actual',
    )
  }
}

export async function requirePauseRoot(
  tx: DbExecutor,
  reasonId: string,
): Promise<void> {
  await tx.execute(sql`lock table public.reasons in share mode`)
  const result = await tx.execute(sql`
    select 1
    from public.reasons root
    where root.id = ${reasonId}
      and root.active
      and root.use = 'pause'
      and root.parent_id is null
      and exists (
        with recursive reachable(id) as (
          select ${reasonId}::uuid
          union
          select t.to_reason_id
          from reachable
          join public.pause_transitions t on t.from_reason_id = reachable.id
        )
        select 1
        from reachable
        join public.reasons exit on exit.id = reachable.id
        where exit.active
          and exit.use = 'pause'
          and exit.pause_step_kind = 'exit'
      )
    limit 1
  `)
  if (!result.rows[0]) {
    throw invalid(
      'El motivo de pausa debe estar activo y tener una salida alcanzable',
    )
  }
}

export async function requireAdvanceTarget(
  tx: DbExecutor,
  currentReasonId: string,
  reasonId: string,
): Promise<void> {
  await requirePauseTarget(tx, currentReasonId, reasonId, 'progress')
}

export async function requireExitTarget(
  tx: DbExecutor,
  currentReasonId: string,
  reasonId: string,
): Promise<void> {
  await requirePauseTarget(tx, currentReasonId, reasonId, 'exit')
}
