import { sql } from 'drizzle-orm'

import type { DbExecutor } from './db.js'
import { currentOccurredAt } from './event-context.js'
import { writeEvent } from './events.js'

/** Hora de la acción en curso: la manual del proxy o la del servidor. */
export function actionTimestamp() {
  const occurredAt = currentOccurredAt()
  return occurredAt ? sql`${occurredAt}::timestamptz` : sql`now()`
}

/**
 * Cierra la pausa abierta y el tramo de trabajo activo. Se usa cuando el
 * tiquet deja de estar en manos del técnico actual (reasignación) o cuando
 * una corrección de captura lo devuelve al supervisor.
 */
export async function closeOpenWorkPhase(
  tx: DbExecutor,
  ticketId: string,
): Promise<void> {
  const at = actionTimestamp()
  await tx.execute(sql`
    update public.time_spans set ended_at = ${at}
    where ticket_id = ${ticketId}
      and kind in ('active_work', 'pause')
      and ended_at is null
  `)
  await tx.execute(sql`
    update public.ticket_pause_steps set exited_at = ${at}
    where pause_id in (
      select id from public.ticket_pauses
      where ticket_id = ${ticketId} and closed_at is null
    )
      and exited_at is null
  `)
  await tx.execute(sql`
    update public.ticket_pauses set closed_at = ${at}
    where ticket_id = ${ticketId} and closed_at is null
  `)
}

/**
 * Termina las asignaciones de técnico abiertas y la participación de esos
 * técnicos. Evita que un técnico desplazado conserve acceso al tiquet.
 */
export async function endTechnicianAssignments(
  tx: DbExecutor,
  ticketId: string,
): Promise<void> {
  const at = actionTimestamp()
  await tx.execute(sql`
    update public.ticket_participants p set ended_at = ${at}
    where p.ticket_id = ${ticketId}
      and p.ended_at is null
      and exists (
        select 1
        from public.ticket_assignments a
        where a.ticket_id = p.ticket_id
          and a.stage = 'technician'
          and a.ended_at is null
          and a.assignee_technician_id = p.technician_id
      )
  `)
  await tx.execute(sql`
    update public.ticket_assignments set ended_at = ${at}
    where ticket_id = ${ticketId}
      and stage = 'technician'
      and ended_at is null
  `)
}

/** Cierra todas las participaciones abiertas del tiquet. */
export async function endOpenParticipants(
  tx: DbExecutor,
  ticketId: string,
): Promise<void> {
  const at = actionTimestamp()
  await tx.execute(sql`
    update public.ticket_participants set ended_at = ${at}
    where ticket_id = ${ticketId} and ended_at is null
  `)
}

export async function isDesignatedForCategory(
  tx: DbExecutor,
  technicianId: string,
  categoryId: string,
): Promise<boolean> {
  const result = await tx.execute(sql`
    select exists (
      select 1
      from public.technician_categories
      where technician_id = ${technicianId}
        and category_id = ${categoryId}
    ) as designated
  `)
  return Boolean(
    (result.rows[0] as { designated: boolean } | undefined)?.designated,
  )
}

export async function openParticipationType(
  tx: DbExecutor,
  ticketId: string,
  technicianId: string,
): Promise<string | null> {
  const result = await tx.execute(sql`
    select participation_type
    from public.ticket_participants
    where ticket_id = ${ticketId}
      and technician_id = ${technicianId}
      and ended_at is null
    order by started_at desc
    limit 1
  `)
  return (
    (result.rows[0] as { participation_type: string } | undefined)
      ?.participation_type ?? null
  )
}

/**
 * Reabre la participación del técnico asignado cuando un ciclo nuevo vuelve a
 * poner el tiquet en trabajo (reclamación procedente o reactivación).
 */
export async function reopenLeaderParticipation(
  tx: DbExecutor,
  ticketId: string,
  actorId: string | null,
): Promise<void> {
  const assignment = await tx.execute(sql`
    select a.assignee_technician_id, t.cycle, t.category_id
    from public.ticket_assignments a
    join public.tickets t on t.id = a.ticket_id
    where a.ticket_id = ${ticketId}
      and a.stage = 'technician'
      and a.ended_at is null
    order by a.assigned_at desc
    limit 1
  `)
  const row = assignment.rows[0] as
    | { assignee_technician_id: string; cycle: number; category_id: string }
    | undefined
  if (!row) return
  const open = await tx.execute(sql`
    select 1
    from public.ticket_participants
    where ticket_id = ${ticketId}
      and technician_id = ${row.assignee_technician_id}
      and ended_at is null
    limit 1
  `)
  if (open.rows[0]) return
  const designated = await isDesignatedForCategory(
    tx,
    row.assignee_technician_id,
    row.category_id,
  )
  const participationType = designated ? 'leader' : 'auxiliary'
  await tx.execute(sql`
    insert into public.ticket_participants (
      ticket_id, cycle, technician_id, participation_type, category_id, recorded_by
    ) values (
      ${ticketId}, ${row.cycle}, ${row.assignee_technician_id},
      ${participationType}, ${row.category_id}, ${actorId}
    )
  `)
}

/**
 * Cierra la reclamación abierta cuando el tiquet se descarta. El evento
 * `claim_resolved` cierra el tramo de tiempo correspondiente.
 */
export async function resolveOpenClaimOnDiscard(
  tx: DbExecutor,
  ticketId: string,
  actorId: string | null,
  note: string,
): Promise<void> {
  const claim = await tx.execute(sql`
    select id
    from public.ticket_claims
    where ticket_id = ${ticketId} and status = 'open'
    order by opened_at desc
    limit 1
    for update
  `)
  const claimId = (claim.rows[0] as { id: string } | undefined)?.id
  if (!claimId) return
  const at = actionTimestamp()
  await tx.execute(sql`
    update public.ticket_claims
    set
      status = 'resolved',
      resolved_by = ${actorId},
      resolved_at = ${at},
      resolution_note = ${note}
    where id = ${claimId}
  `)
  await writeEvent(tx, {
    ticketId,
    type: 'claim_resolved',
    actorId,
    payload: { note },
  })
}
