import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  conflict,
  isFinalStatus,
  lockTicket,
  notFound,
  requireReason,
  validateHandled,
  type ActionResult,
  type LockedTicket,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { assertTechnicianAction } from './proxy.js'
import { findVisibleTicket } from './repository.js'

type RecaptureChanges = {
  buildingId?: string
  locationId?: string
  dependencyId?: string
  categoryId?: string
  subcategoryId?: string
  problemId?: string
  serviceTypeId?: string
  priorityId?: string
  description?: string
}

export type RecaptureInput = {
  ticketId: string
  changes: RecaptureChanges
  reasonId: string | null
  clientRequestId: string
  subjectTechnicianId?: string | null
}

type TicketRow = LockedTicket

function field(value: string | undefined): string | null {
  return value ?? null
}

async function updateFields(
  tx: DbExecutor,
  ticket: TicketRow,
  changes: RecaptureChanges,
) {
  await tx.execute(sql`
    update public.tickets set
      building_id = coalesce(${field(changes.buildingId)}, building_id),
      location_id = coalesce(${field(changes.locationId)}, location_id),
      dependency_id = coalesce(${field(changes.dependencyId)}, dependency_id),
      category_id = coalesce(${field(changes.categoryId)}, category_id),
      subcategory_id = coalesce(${field(changes.subcategoryId)}, subcategory_id),
      problem_id = coalesce(${field(changes.problemId)}, problem_id),
      service_type_id = coalesce(${field(changes.serviceTypeId)}, service_type_id),
      priority_id = coalesce(${field(changes.priorityId)}, priority_id),
      description = coalesce(${field(changes.description)}, description)
    where id = ${ticket.id}
  `)
}

async function applyCategoryChange(
  tx: DbExecutor,
  ticket: TicketRow,
  categoryId: string,
) {
  const category = await tx.execute(sql`
    select team_id from public.categories where id = ${categoryId} limit 1
  `)
  const newTeam = (category.rows[0] as { team_id: string } | undefined)?.team_id
  if (!newTeam) {
    throw new AppError(400, 'validation_error', 'Categoría no válida')
  }
  await tx.execute(sql`
    update public.tickets set team_id = ${newTeam} where id = ${ticket.id}
  `)
  const assignment = await tx.execute(sql`
    select assignee_technician_id
    from public.ticket_assignments
    where ticket_id = ${ticket.id}
      and stage = 'technician'
      and ended_at is null
    order by assigned_at desc
    limit 1
  `)
  const technicianId = (
    assignment.rows[0] as { assignee_technician_id: string | null } | undefined
  )?.assignee_technician_id
  if (!technicianId) return
  const designated = await tx.execute(sql`
    select exists (
      select 1 from public.technician_categories
      where technician_id = ${technicianId}
        and category_id = ${categoryId}
    ) as designated
  `)
  const isDesignated = Boolean(
    (designated.rows[0] as { designated: boolean } | undefined)?.designated,
  )
  if (!isDesignated && newTeam !== ticket.team_id) {
    await tx.execute(sql`
      update public.tickets set status = 'with_supervisor' where id = ${ticket.id}
    `)
  }
}

async function applyChanges(
  tx: DbExecutor,
  ticket: TicketRow,
  changes: RecaptureChanges,
) {
  await updateFields(tx, ticket, changes)
  if (changes.categoryId) {
    await applyCategoryChange(tx, ticket, changes.categoryId)
  }
}

async function recaptureInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: RecaptureInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'capture_recaptured',
    'recapture',
  )
  if (before) return before
  const ticket = await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'capture_recaptured',
    'recapture',
  )
  if (after) return after
  if (isFinalStatus(ticket.status)) {
    throw conflict('El tiquet no admite recaptura en su estado')
  }
  if (Object.keys(input.changes).length === 0) {
    throw new AppError(400, 'validation_error', 'Indica al menos un cambio')
  }
  if (input.reasonId) {
    await requireReason(tx, input.reasonId, 'recapture', 'Motivo')
  }
  const row = ticket
  await tx.execute(sql`
    insert into public.ticket_captures (
      ticket_id, cycle, changed_by, reason_id, changes
    ) values (
      ${input.ticketId}, ${row.cycle}, ${actor.id}, ${input.reasonId},
      ${JSON.stringify(input.changes)}::jsonb
    )
  `)
  await applyChanges(tx, row, input.changes)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'capture_recaptured',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    subjectTechnicianId: input.subjectTechnicianId ?? null,
    payload: input.changes,
  })
  return { ticketId: input.ticketId, action: 'recapture', replayed: false }
}

export async function recaptureTicket(
  db: Database,
  actor: Actor,
  input: RecaptureInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  await assertTechnicianAction({
    db,
    actor,
    access,
    permission: 'ticket.recapture',
    subjectTechnicianId: input.subjectTechnicianId,
    requireParticipant: false,
  })
  return db.transaction((tx) => recaptureInTransaction(tx, actor, input))
}
