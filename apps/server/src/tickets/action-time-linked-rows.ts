import { sql, type SQL } from 'drizzle-orm'

import type { DbExecutor } from './db.js'

type Timestamp = SQL

async function shiftParticipants(
  tx: DbExecutor,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_participants set
      started_at = case when started_event_id = ${eventId} then ${at} else started_at end,
      ended_at = case when ended_event_id = ${eventId} then ${at} else ended_at end
    where started_event_id = ${eventId} or ended_event_id = ${eventId}
  `)
}

async function shiftAssignments(
  tx: DbExecutor,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_assignments set
      assigned_at = case when assigned_event_id = ${eventId} then ${at} else assigned_at end,
      ended_at = case when ended_event_id = ${eventId} then ${at} else ended_at end
    where assigned_event_id = ${eventId} or ended_event_id = ${eventId}
  `)
}

async function shiftPauses(tx: DbExecutor, eventId: number, at: Timestamp) {
  await tx.execute(sql`
    update public.ticket_pauses set
      opened_at = case when opened_event_id = ${eventId} then ${at} else opened_at end,
      closed_at = case when closed_event_id = ${eventId} then ${at} else closed_at end
    where opened_event_id = ${eventId} or closed_event_id = ${eventId}
  `)
}

async function shiftSteps(tx: DbExecutor, eventId: number, at: Timestamp) {
  await tx.execute(sql`
    update public.ticket_pause_steps set
      entered_at = case when entered_event_id = ${eventId} then ${at} else entered_at end,
      exited_at = case when exited_event_id = ${eventId} then ${at} else exited_at end
    where entered_event_id = ${eventId} or exited_event_id = ${eventId}
  `)
}

async function shiftValidations(
  tx: DbExecutor,
  eventId: number,
  at: Timestamp,
) {
  await tx.execute(sql`
    update public.ticket_validations set validated_at = ${at}
    where event_id = ${eventId}
  `)
}

async function shiftClaims(tx: DbExecutor, eventId: number, at: Timestamp) {
  await tx.execute(sql`
    update public.ticket_claims set
      opened_at = case when opened_event_id = ${eventId} then ${at} else opened_at end,
      resolved_at = case when resolved_event_id = ${eventId} then ${at} else resolved_at end
    where opened_event_id = ${eventId} or resolved_event_id = ${eventId}
  `)
}

async function shiftCaptures(tx: DbExecutor, eventId: number, at: Timestamp) {
  await tx.execute(sql`
    update public.ticket_captures set changed_at = ${at}
    where event_id = ${eventId}
  `)
}

async function shiftOffers(tx: DbExecutor, eventId: number, at: Timestamp) {
  await tx.execute(sql`
    update public.ticket_offers set
      offered_at = case when offered_event_id = ${eventId} then ${at} else offered_at end,
      resolved_at = case when resolved_event_id = ${eventId} then ${at} else resolved_at end
    where offered_event_id = ${eventId} or resolved_event_id = ${eventId}
  `)
}

async function shiftEvidence(tx: DbExecutor, eventId: number, at: Timestamp) {
  await tx.execute(sql`
    update public.evidence set occurred_at = ${at}, time_confidence = 'corrected'
    where event_id = ${eventId}
  `)
}

/** Mueve todas las filas enlazadas al evento ajustado. */
export async function shiftLinkedRows(
  tx: DbExecutor,
  eventId: number,
  proposed: Date,
): Promise<void> {
  const at = sql`${proposed}::timestamptz`
  await shiftParticipants(tx, eventId, at)
  await shiftAssignments(tx, eventId, at)
  await shiftPauses(tx, eventId, at)
  await shiftSteps(tx, eventId, at)
  await shiftValidations(tx, eventId, at)
  await shiftClaims(tx, eventId, at)
  await shiftCaptures(tx, eventId, at)
  await shiftOffers(tx, eventId, at)
  await shiftEvidence(tx, eventId, at)
}
