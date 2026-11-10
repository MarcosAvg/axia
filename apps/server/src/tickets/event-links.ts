import { sql, type SQL } from 'drizzle-orm'

import type { DbExecutor } from './db.js'

type Timestamp = SQL

async function participantsStarted(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_participants set started_event_id = ${eventId}
    where ticket_id = ${ticketId}
      and started_event_id is null
      and started_at = ${at}
  `)
}

async function participantsEnded(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_participants set ended_event_id = ${eventId}
    where ticket_id = ${ticketId}
      and ended_event_id is null
      and ended_at = ${at}
  `)
}

async function assignmentsAssigned(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_assignments set assigned_event_id = ${eventId}
    where ticket_id = ${ticketId}
      and assigned_event_id is null
      and assigned_at = ${at}
  `)
}

async function assignmentsEnded(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_assignments set ended_event_id = ${eventId}
    where ticket_id = ${ticketId}
      and ended_event_id is null
      and ended_at = ${at}
  `)
}

async function pausesOpened(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_pauses set opened_event_id = ${eventId}
    where ticket_id = ${ticketId}
      and opened_event_id is null
      and opened_at = ${at}
  `)
}

async function pausesClosed(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_pauses set closed_event_id = ${eventId}
    where ticket_id = ${ticketId}
      and closed_event_id is null
      and closed_at = ${at}
  `)
}

async function stepsEntered(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_pause_steps s set entered_event_id = ${eventId}
    from public.ticket_pauses p
    where p.id = s.pause_id
      and p.ticket_id = ${ticketId}
      and s.entered_event_id is null
      and s.entered_at = ${at}
  `)
}

async function stepsExited(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_pause_steps s set exited_event_id = ${eventId}
    from public.ticket_pauses p
    where p.id = s.pause_id
      and p.ticket_id = ${ticketId}
      and s.exited_event_id is null
      and s.exited_at = ${at}
  `)
}

async function validations(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_validations set event_id = ${eventId}
    where ticket_id = ${ticketId}
      and event_id is null
      and validated_at = ${at}
  `)
}

async function claimsOpened(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_claims set opened_event_id = ${eventId}
    where ticket_id = ${ticketId}
      and opened_event_id is null
      and opened_at = ${at}
  `)
}

async function claimsResolved(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_claims set resolved_event_id = ${eventId}
    where ticket_id = ${ticketId}
      and resolved_event_id is null
      and resolved_at = ${at}
  `)
}

async function captures(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_captures set event_id = ${eventId}
    where ticket_id = ${ticketId}
      and event_id is null
      and changed_at = ${at}
  `)
}

async function offersOffered(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_offers set offered_event_id = ${eventId}
    where ticket_id = ${ticketId}
      and offered_event_id is null
      and offered_at = ${at}
  `)
}

async function offersResolved(
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_offers set resolved_event_id = ${eventId}
    where ticket_id = ${ticketId}
      and resolved_event_id is null
      and resolved_at = ${at}
  `)
}

type LinkFn = (
  tx: DbExecutor,
  ticketId: string,
  eventId: number,
  at: Timestamp,
) => Promise<void>

const LINKS: Record<string, LinkFn[]> = {
  offered: [offersOffered],
  taken: [offersResolved, assignmentsAssigned],
  assigned_technician: [
    offersResolved,
    assignmentsAssigned,
    assignmentsEnded,
    participantsStarted,
    participantsEnded,
  ],
  reassigned_technician: [
    offersResolved,
    assignmentsAssigned,
    assignmentsEnded,
    participantsStarted,
    participantsEnded,
  ],
  auxiliary_added: [participantsStarted],
  paused: [pausesOpened, stepsEntered],
  pause_advanced: [stepsEntered, stepsExited],
  resumed: [pausesClosed, stepsExited],
  validated: [validations, participantsEnded, assignmentsEnded],
  claim_opened: [claimsOpened, participantsEnded, pausesClosed, stepsExited],
  claim_resolved: [claimsResolved, participantsEnded, assignmentsEnded],
  reopened: [claimsResolved, participantsStarted],
  rejected: [participantsEnded, assignmentsEnded],
  cancelled: [participantsEnded, assignmentsEnded],
  duplicate_marked: [participantsEnded, assignmentsEnded],
  reactivated: [participantsStarted],
  reassigned_supervisor: [
    assignmentsAssigned,
    assignmentsEnded,
    participantsEnded,
    offersResolved,
  ],
  capture_recaptured: [captures],
}

/**
 * Enlaza las filas de negocio escritas en el mismo instante que el evento.
 * Solo actúa sobre filas aún sin enlace, así el primer evento del instante
 * conserva la autoría y los siguientes no la reescriben.
 */
export async function linkBusinessRows(
  tx: DbExecutor,
  {
    ticketId,
    eventId,
    type,
    occurredAt,
  }: {
    ticketId: string
    eventId: number
    type: string
    occurredAt: Date | string
  },
): Promise<void> {
  const links = LINKS[type]
  if (!links) return
  const at = sql`${occurredAt}::timestamptz`
  for (const link of links) {
    await link(tx, ticketId, eventId, at)
  }
}
