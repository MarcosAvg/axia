import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  conflict,
  lockTicket,
  notFound,
  requireReason,
  validateHandled,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { routeTicket } from './routing.js'
import { findHandledEvent, writeEvent } from './events.js'
import {
  actionTimestamp,
  closeOpenWorkPhase,
  endOpenParticipants,
  endTechnicianAssignments,
} from './flow-state.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'
import { getPermissionScope } from './access.js'

export type ReassignSupervisorInput = {
  ticketId: string
  reasonId: string
  supervisorUserId: string | null
  teamId: string | null
  note: string | null
  clientRequestId: string
}

async function assertHolder(tx: DbExecutor, actor: Actor, ticketId: string) {
  const holder = await tx.execute(sql`
    select 1 from public.ticket_assignments
    where ticket_id = ${ticketId}
      and stage = 'supervisor'
      and assignee_user_id = ${actor.id}
      and ended_at is null
    limit 1
  `)
  if (holder.rows[0]) return
  if (getPermissionScope(actor, 'ticket.assign_supervisor') !== 'all') {
    throw new AppError(
      403,
      'forbidden',
      'Solo quien tiene el tiquet puede reasignarlo',
    )
  }
}

async function requireActiveSupervisor(
  tx: DbExecutor,
  userId: string,
  ticketId: string,
) {
  const result = await tx.execute(sql`
    select 1
    from public.users u
    join public.supervisor_scopes ss on ss.user_id = u.id and ss.active
    join public.supervisor_scope_buildings ssb on ssb.scope_id = ss.id
    join public.tickets t on t.id = ${ticketId}
    where u.id = ${userId}
      and u.active
      and ss.team_id = t.team_id
      and ssb.building_id = t.building_id
      and exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id and r.active
        join public.role_permissions rp on rp.role_id = r.id
        where ur.user_id = u.id and rp.permission_id = 'ticket.view'
      )
      and exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id and r.active
        join public.role_permissions rp on rp.role_id = r.id
        where ur.user_id = u.id and rp.permission_id = 'ticket.assign_technician'
      )
    limit 1
  `)
  if (!result.rows[0]) {
    throw new AppError(
      400,
      'validation_error',
      'El supervisor no tiene alcance o no puede continuar este tiquet',
    )
  }
}

async function requireActiveTeam(tx: DbExecutor, teamId: string) {
  const result = await tx.execute(sql`
    select id from public.teams where id = ${teamId} and active limit 1
  `)
  if (!result.rows[0]) {
    throw new AppError(400, 'validation_error', 'Equipo no válido')
  }
}

async function assignToSupervisor(
  tx: DbExecutor,
  actor: Actor,
  input: ReassignSupervisorInput,
  cycle: number,
): Promise<ActionResult> {
  const supervisorUserId = input.supervisorUserId as string
  await requireActiveSupervisor(tx, supervisorUserId, input.ticketId)
  await tx.execute(sql`
    update public.tickets
    set status = 'with_supervisor'
    where id = ${input.ticketId}
  `)
  await tx.execute(sql`
    insert into public.ticket_assignments (
      ticket_id, cycle, stage, assignee_user_id, assigned_by, reason_id, note,
      assigned_at
    ) values (
      ${input.ticketId}, ${cycle}, 'supervisor',
      ${supervisorUserId}, ${actor.id}, ${input.reasonId}, ${input.note},
      ${actionTimestamp()}
    )
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'reassigned_supervisor',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    subjectUserId: supervisorUserId,
    payload: { toSupervisor: supervisorUserId, note: input.note },
  })
  return {
    ticketId: input.ticketId,
    action: 'assign_supervisor',
    replayed: false,
  }
}

async function assignToTeam(
  tx: DbExecutor,
  actor: Actor,
  input: ReassignSupervisorInput,
  cycle: number,
): Promise<ActionResult> {
  const teamId = input.teamId as string
  const ticketBuildingId = await buildingId(tx, input.ticketId)
  await requireActiveTeam(tx, teamId)
  await tx.execute(sql`
    update public.tickets
    set team_id = ${teamId}, status = 'registered'
    where id = ${input.ticketId}
  `)
  await routeTicket({
    tx,
    ticketId: input.ticketId,
    cycle,
    teamId,
    buildingId: ticketBuildingId,
    actorId: actor.id,
  })
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'reassigned_supervisor',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    payload: { toTeam: teamId, note: input.note },
  })
  return {
    ticketId: input.ticketId,
    action: 'assign_supervisor',
    replayed: false,
  }
}

async function reassignInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: ReassignSupervisorInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'reassigned_supervisor',
    'assign_supervisor',
  )
  if (before) return before
  const ticket = await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'reassigned_supervisor',
    'assign_supervisor',
  )
  if (after) return after
  const isAdministrator =
    getPermissionScope(actor, 'ticket.assign_supervisor') === 'all'
  const allowed = ['with_supervisor', 'assigned', 'paused', 'in_progress']
  // La cola de administración incluye los tiquets registrados que quedaron sin
  // ofertas; el administrador puede devolverlos a ruteo (RN-03).
  if (isAdministrator) allowed.push('registered')
  if (!allowed.includes(ticket.status)) {
    throw conflict('El tiquet no admite reasignación de supervisor')
  }
  await assertHolder(tx, actor, input.ticketId)
  await requireReason(tx, input.reasonId, 'supervisor_reassignment', 'Motivo')

  await tx.execute(sql`
    update public.ticket_assignments
    set ended_at = ${actionTimestamp()}
    where ticket_id = ${input.ticketId}
      and stage = 'supervisor'
      and ended_at is null
  `)
  await tx.execute(sql`
    update public.ticket_offers
    set status = 'withdrawn', resolved_at = ${actionTimestamp()}
    where ticket_id = ${input.ticketId} and status = 'offered'
  `)

  // El tiquet deja de estar en manos del técnico actual: se cierra la pausa
  // o el tramo activo y se termina su asignación antes de volver al supervisor.
  await closeOpenWorkPhase(tx, input.ticketId)
  await endTechnicianAssignments(tx, input.ticketId)
  await endOpenParticipants(tx, input.ticketId)

  if (input.supervisorUserId) {
    return assignToSupervisor(tx, actor, input, ticket.cycle)
  }
  return assignToTeam(tx, actor, input, ticket.cycle)
}

async function buildingId(tx: DbExecutor, ticketId: string): Promise<string> {
  const result = await tx.execute(sql`
    select building_id from public.tickets where id = ${ticketId}
  `)
  return (result.rows[0] as { building_id: string }).building_id
}

export async function reassignSupervisor(
  db: Database,
  actor: Actor,
  input: ReassignSupervisorInput,
): Promise<ActionResult> {
  if (Boolean(input.supervisorUserId) === Boolean(input.teamId)) {
    throw new AppError(
      400,
      'validation_error',
      'Indica un supervisor o un equipo, pero no ambos',
    )
  }
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.assign_supervisor', access)
  return db.transaction((tx) => reassignInTransaction(tx, actor, input))
}
