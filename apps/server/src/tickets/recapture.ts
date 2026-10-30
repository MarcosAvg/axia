import { sql, type SQL } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  conflict,
  notFound,
  requireReason,
  validateHandled,
  type ActionResult,
} from './action-shared.js'
import { routeTicket } from './create.js'
import { validateRecaptureInputs } from './create-validation.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import {
  actionTimestamp,
  endTechnicianAssignments,
  isDesignatedForCategory,
  openParticipationType,
} from './flow-state.js'
import { assertTechnicianAction } from './proxy.js'
import { findVisibleTicket } from './repository.js'

type RecaptureChanges = {
  buildingId?: string
  locationId?: string
  dependencyId?: string
  categoryId?: string
  subcategoryId?: string | null
  problemId?: string | null
  serviceTypeId?: string | null
  priorityId?: string
  description?: string
}

export type RecaptureInput = {
  ticketId: string
  changes: RecaptureChanges
  reasonId: string | null
  note: string | null
  clientRequestId: string
  subjectTechnicianId?: string | null
}

type RecaptureTicket = {
  id: string
  status: string
  cycle: number
  category_id: string
  team_id: string
  building_id: string
  location_id: string
  dependency_id: string
  subcategory_id: string | null
  problem_id: string | null
  service_type_id: string | null
  priority_id: string
}

// La recaptura corrige la captura antes de iniciar el trabajo (RN-10).
const RECAPTURABLE = ['registered', 'with_supervisor', 'assigned']

async function lockRecaptureTicket(
  tx: DbExecutor,
  ticketId: string,
): Promise<RecaptureTicket> {
  const result = await tx.execute(sql`
    select * from public.tickets
    where id = ${ticketId}
    for update
  `)
  const row = result.rows[0] as RecaptureTicket | undefined
  if (!row) throw notFound()
  return row
}

const RECAPTURE_COLUMNS: Array<[keyof RecaptureChanges, string]> = [
  ['buildingId', 'building_id'],
  ['locationId', 'location_id'],
  ['dependencyId', 'dependency_id'],
  ['categoryId', 'category_id'],
  ['subcategoryId', 'subcategory_id'],
  ['problemId', 'problem_id'],
  ['serviceTypeId', 'service_type_id'],
  ['priorityId', 'priority_id'],
  ['description', 'description'],
]

async function updateFields(
  tx: DbExecutor,
  ticket: RecaptureTicket,
  changes: RecaptureChanges,
) {
  const updates: SQL[] = RECAPTURE_COLUMNS.filter(
    ([key]) => changes[key] !== undefined,
  ).map(
    ([key, column]) =>
      sql`${sql.identifier(column)} = ${changes[key] as string | null}`,
  )
  if (updates.length === 0) return
  await tx.execute(sql`
    update public.tickets
    set ${sql.join(updates, sql`, `)}
    where id = ${ticket.id}
  `)
}

async function problemTeam(tx: DbExecutor, problemId: string) {
  const problem = await tx.execute(sql`
    select team_id from public.problems where id = ${problemId} limit 1
  `)
  const teamId = (problem.rows[0] as { team_id: string } | undefined)?.team_id
  if (!teamId) {
    throw new AppError(400, 'validation_error', 'Problema no válido')
  }
  return teamId
}

async function openAssignmentTechnician(
  tx: DbExecutor,
  ticketId: string,
): Promise<string | null> {
  const result = await tx.execute(sql`
    select assignee_technician_id
    from public.ticket_assignments
    where ticket_id = ${ticketId}
      and stage = 'technician'
      and ended_at is null
    order by assigned_at desc
    limit 1
  `)
  return (
    (result.rows[0] as { assignee_technician_id: string | null } | undefined)
      ?.assignee_technician_id ?? null
  )
}

type RoutingInput = {
  actor: Actor
  ticket: RecaptureTicket
  teamId: string
  buildingId: string
}

/** Devuelve el tiquet a ruteo con el equipo y edificio corregidos. */
async function resetRouting(tx: DbExecutor, input: RoutingInput) {
  const { actor, ticket, teamId, buildingId } = input
  const at = actionTimestamp()
  await endTechnicianAssignments(tx, ticket.id)
  await tx.execute(sql`
    update public.ticket_offers
    set status = 'withdrawn', resolved_at = ${at}
    where ticket_id = ${ticket.id} and status = 'offered'
  `)
  await tx.execute(sql`
    update public.ticket_assignments set ended_at = ${at}
    where ticket_id = ${ticket.id}
      and stage = 'supervisor'
      and ended_at is null
  `)
  await tx.execute(sql`
    update public.tickets
    set status = 'registered', team_id = ${teamId}
    where id = ${ticket.id}
  `)
  await routeTicket({
    tx,
    ticketId: ticket.id,
    cycle: ticket.cycle,
    teamId,
    buildingId,
    actorId: actor.id,
  })
}

/** Conserva al técnico asignado o lo libera si la nueva categoría no le toca. */
async function reconcileAssignedTechnician(
  tx: DbExecutor,
  ticket: RecaptureTicket,
  categoryId: string,
  categoryChanged: boolean,
) {
  if (ticket.status !== 'assigned' || !categoryChanged) return
  const technicianId = await openAssignmentTechnician(tx, ticket.id)
  if (!technicianId) return
  const stays =
    (await isDesignatedForCategory(tx, technicianId, categoryId)) ||
    (await openParticipationType(tx, ticket.id, technicianId)) === 'auxiliary'
  if (stays) return

  await endTechnicianAssignments(tx, ticket.id)
  await tx.execute(sql`
    update public.tickets set status = 'with_supervisor' where id = ${ticket.id}
  `)
}

/**
 * Aplica la captura y ajusta el ruteo cuando cambia el equipo, el edificio o
 * la categoría del técnico asignado (RN-11).
 */
async function applyChanges(
  tx: DbExecutor,
  actor: Actor,
  ticket: RecaptureTicket,
  changes: RecaptureChanges,
) {
  const before = {
    categoryId: ticket.category_id,
    teamId: ticket.team_id,
    buildingId: ticket.building_id,
  }
  await validateRecaptureInputs(tx, {
    current: {
      buildingId: ticket.building_id,
      locationId: ticket.location_id,
      dependencyId: ticket.dependency_id,
      categoryId: ticket.category_id,
      subcategoryId: ticket.subcategory_id,
      problemId: ticket.problem_id,
      serviceTypeId: ticket.service_type_id,
      priorityId: ticket.priority_id,
    },
    changes,
  })
  await updateFields(tx, ticket, changes)

  const categoryChanged =
    changes.categoryId !== undefined && changes.categoryId !== before.categoryId
  const newTeamId = changes.problemId
    ? await problemTeam(tx, changes.problemId)
    : before.teamId
  const newBuildingId = changes.buildingId ?? before.buildingId
  const moved =
    newTeamId !== before.teamId || newBuildingId !== before.buildingId

  if (newTeamId !== before.teamId) {
    await tx.execute(sql`
      update public.tickets set team_id = ${newTeamId} where id = ${ticket.id}
    `)
  }

  if (moved) {
    await resetRouting(tx, {
      actor,
      ticket,
      teamId: newTeamId,
      buildingId: newBuildingId,
    })
    return
  }

  await reconcileAssignedTechnician(
    tx,
    ticket,
    changes.categoryId ?? before.categoryId,
    categoryChanged,
  )
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
  const ticket = await lockRecaptureTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'capture_recaptured',
    'recapture',
  )
  if (after) return after
  if (!RECAPTURABLE.includes(ticket.status)) {
    throw conflict('El tiquet no admite recaptura en su estado')
  }
  if (Object.keys(input.changes).length === 0) {
    throw new AppError(400, 'validation_error', 'Indica al menos un cambio')
  }
  if (input.reasonId) {
    await requireReason(tx, input.reasonId, 'recapture', 'Motivo')
  }
  await tx.execute(sql`
    insert into public.ticket_captures (
      ticket_id, cycle, changed_by, reason_id, changes
    ) values (
      ${input.ticketId}, ${ticket.cycle}, ${actor.id}, ${input.reasonId},
      ${JSON.stringify(input.changes)}::jsonb
    )
  `)
  await applyChanges(tx, actor, ticket, input.changes)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'capture_recaptured',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    subjectTechnicianId: input.subjectTechnicianId ?? null,
    payload: { ...input.changes, note: input.note ?? null },
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
