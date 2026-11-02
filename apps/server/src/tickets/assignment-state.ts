import { sql } from 'drizzle-orm'

import { AppError } from '../http/errors.js'
import { requireReason } from './action-shared.js'
import type { DbExecutor } from './db.js'
import { actionTimestamp, endTechnicianAssignments } from './flow-state.js'

export type Leader = {
  technicianId: string
}

export async function currentLeader(
  tx: DbExecutor,
  ticketId: string,
): Promise<Leader | null> {
  const result = await tx.execute(sql`
    select coalesce(
      (
        select a.assignee_technician_id
        from public.ticket_assignments a
        where a.ticket_id = ${ticketId}
          and a.stage = 'technician'
          and a.ended_at is null
        order by a.assigned_at desc
        limit 1
      ),
      (
        select p.technician_id
        from public.ticket_participants p
        where p.ticket_id = ${ticketId}
          and p.participation_type = 'leader'
          and p.ended_at is null
        order by p.started_at desc
        limit 1
      )
    ) as technician_id
  `)
  const row = result.rows[0] as { technician_id: string | null } | undefined
  return row?.technician_id ? { technicianId: row.technician_id } : null
}

export async function hasActiveParticipation(
  tx: DbExecutor,
  ticketId: string,
  technicianId: string,
): Promise<boolean> {
  const result = await tx.execute(sql`
    select 1
    from public.ticket_participants
    where ticket_id = ${ticketId}
      and technician_id = ${technicianId}
      and ended_at is null
    limit 1
  `)
  return Boolean(result.rows[0])
}

export async function endAuxiliaryParticipation(
  tx: DbExecutor,
  ticketId: string,
  technicianId: string,
) {
  await tx.execute(sql`
    update public.ticket_participants set ended_at = ${actionTimestamp()}
    where ticket_id = ${ticketId}
      and technician_id = ${technicianId}
      and participation_type = 'auxiliary'
      and ended_at is null
  `)
}

export async function closePreviousAssignment(
  tx: DbExecutor,
  ticketId: string,
) {
  await endTechnicianAssignments(tx, ticketId)
  await tx.execute(sql`
    update public.ticket_offers
    set status = 'withdrawn', resolved_at = now()
    where ticket_id = ${ticketId} and status = 'offered'
  `)
}

export async function requireAssignReason(
  tx: DbExecutor,
  reasonId: string | null,
  use: string,
) {
  if (!reasonId) {
    throw new AppError(400, 'validation_error', 'Indica el motivo')
  }
  await requireReason(tx, reasonId, use, 'Motivo')
}
