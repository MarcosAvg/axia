import { atHours, type TicketContext } from './ticket-internal.js'

type PauseIdRow = { id: string }

async function insertPauseSteps(
  context: TicketContext,
  pauseId: string,
  window: {
    opened: Date
    advanced: Date
    closed: Date | null
    rootId: string
    substateId: string
  },
) {
  const { client } = context
  const { rootId, substateId } = window
  await client.query(
    `insert into public.ticket_pause_steps (
       pause_id, reason_id, entered_at, exited_at, actor_id, note
     ) values ($1, $2, $3, $4, $5, $6)`,
    [
      pauseId,
      rootId,
      window.opened,
      window.advanced,
      context.people.technicianUserId,
      'Paso inicial',
    ],
  )
  await client.query(
    `insert into public.ticket_pause_steps (
       pause_id, reason_id, entered_at, exited_at, actor_id, note
     ) values ($1, $2, $3, $4, $5, $6)`,
    [
      pauseId,
      substateId,
      window.advanced,
      window.closed,
      context.people.technicianUserId,
      'Subestado demo',
    ],
  )
}

export async function insertPauses(context: TicketContext) {
  const { client, ticket, times, reasons } = context
  for (const pause of ticket.pauses ?? []) {
    const rootId = reasons.id('pause', pause.root)
    const substateId = reasons.id('pause', pause.substate, pause.root)
    const exitId =
      pause.exit !== undefined
        ? reasons.id('pause', pause.exit, pause.root)
        : substateId
    const opened = atHours(times.reportedAt, pause.openedAfterHours)
    const advanced = atHours(times.reportedAt, pause.advanceAfterHours)
    const closed =
      pause.closedAfterHours !== undefined
        ? atHours(times.reportedAt, pause.closedAfterHours)
        : null
    const inserted = await client.query<PauseIdRow>(
      `insert into public.ticket_pauses (
         ticket_id, cycle, reason_id, opened_by, opened_at, closed_at,
         root_reason_id, closed_reason_id, note
       ) values ($1, 1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [
        ticket.id,
        closed ? rootId : substateId,
        context.people.technicianUserId,
        opened,
        closed,
        rootId,
        closed ? exitId : null,
        'Pausa ficticia de la demo',
      ],
    )
    const pauseId = inserted.rows[0]?.id
    if (!pauseId) throw new Error('Demo pause could not be inserted')
    await insertPauseSteps(context, pauseId, {
      opened,
      advanced,
      closed,
      rootId,
      substateId,
    })
  }
}

export async function insertClaims(context: TicketContext) {
  const { client, ticket, times, reasons } = context
  if (ticket.status === 'under_claim' && times.claimAt) {
    await client.query(
      `insert into public.ticket_claims (
         ticket_id, cycle, opened_by, opened_at, reason_id, description,
         status, prior_status
       ) values ($1, 1, $2, $3, $4, $5, 'open', 'attended')`,
      [
        ticket.id,
        context.people.requesterUserId,
        times.claimAt,
        reasons.id('claim', ticket.claimReason ?? 'Trabajo incompleto'),
        ticket.claimDescription ?? 'Reclamación ficticia de la demo',
      ],
    )
  }
  if (ticket.reopen && times.reopen) {
    await client.query(
      `insert into public.ticket_claims (
         ticket_id, cycle, opened_by, opened_at, reason_id, description,
         status, prior_status, resolution, resolved_by, resolved_at,
         resolution_note
       ) values ($1, 1, $2, $3, $4, $5, 'resolved', 'closed',
         'upheld', $6, $7, $8)`,
      [
        ticket.id,
        context.people.requesterUserId,
        times.reopen.claimAt,
        reasons.id('claim', ticket.reopen.claimReason),
        ticket.reopen.description,
        context.people.supervisorId,
        times.reopen.resolvedAt,
        'Reclamación procedente en la demo',
      ],
    )
  }
}

export async function insertCaptures(context: TicketContext) {
  const { client, ticket, times, reasons } = context
  if (!ticket.recapture) return
  await client.query(
    `insert into public.ticket_captures (
       ticket_id, cycle, changed_by, changed_at, reason_id, changes
     ) values ($1, 1, $2, $3, $4, $5::jsonb)`,
    [
      ticket.id,
      context.people.supervisorId,
      atHours(times.reportedAt, ticket.recapture.afterHours),
      reasons.id('recapture', ticket.recapture.reason),
      JSON.stringify({ description: 'Descripción corregida en la demo' }),
    ],
  )
}

export async function insertDuplicateLinks(context: TicketContext) {
  const { client, ticket, times } = context
  const at = times.discardAt ?? times.reportedAt
  if (ticket.duplicateOf) {
    await client.query(
      `insert into public.ticket_links (
         ticket_id, linked_ticket_id, link_type, created_by
       ) values ($1, $2, 'duplicate_of', $3) on conflict do nothing`,
      [ticket.id, ticket.duplicateOf, context.people.supervisorId],
    )
  }
  if (!ticket.duplicateCandidateOf) return
  const decision = ticket.duplicateCandidateDecision ?? null
  await client.query(
    `insert into public.ticket_duplicate_candidates (
       ticket_id, candidate_ticket_id, similarity, score, reasons, shown_at,
       decision, decided_by, decided_at
     ) values ($1, $2, $3, $3, $4, $5, $6, $7, $8)`,
    [
      ticket.id,
      ticket.duplicateCandidateOf,
      0.72 + (context.cycle % 3) * 0.05,
      ['problem', 'location'],
      at,
      decision,
      decision === null ? null : context.people.supervisorId,
      decision === null ? null : at,
    ],
  )
}

export async function insertRatings(context: TicketContext) {
  const { client, ticket, ids, times, people } = context
  if (ticket.rating === undefined || !times.ratingAt) return
  const ratedBy =
    ticket.requester === 'ana' ? people.requesterUserId : people.supervisorId
  await client.query(
    `insert into public.ticket_ratings (
       ticket_id, score, comment, rated_by, requester_id, created_at, updated_at
     ) values ($1, $2, $3, $4, $5, $6, $6)`,
    [
      ticket.id,
      ticket.rating,
      ticket.rating >= 4
        ? 'Servicio conforme en la demo.'
        : 'Atención mejorable en la demo.',
      ratedBy,
      ids.requesterId,
      times.ratingAt,
    ],
  )
}

export async function insertValidations(context: TicketContext) {
  const { client, ticket, times, people } = context
  if (ticket.status !== 'closed') return
  const rows: Array<[number, Date]> = [[1, times.validated]]
  if (ticket.reopen && times.reopen) rows.push([2, times.reopen.validated])
  for (const [cycle, at] of rows) {
    await client.query(
      `insert into public.ticket_validations (
         ticket_id, cycle, validator_user_id, validator_role, validated_at
       ) values ($1, $2, $3, 'requester', $4), ($1, $2, $3, 'supervisor', $4)`,
      [ticket.id, cycle, people.supervisorId, at],
    )
  }
}
