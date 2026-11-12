import {
  activeTechnicianId,
  atHours,
  finalAt,
  reassignedAt,
  type TicketContext,
} from './ticket-internal.js'

async function insertSupervisorAssignment(context: TicketContext) {
  await context.client.query(
    `insert into public.ticket_assignments (
       ticket_id, cycle, stage, assignee_user_id, assigned_by, assigned_at
     ) values ($1, 1, 'supervisor', $2, $2, $3)`,
    [context.ticket.id, context.people.supervisorId, context.times.taken],
  )
}

async function insertSupervisorReassignment(context: TicketContext) {
  const { client, ticket, people, times, reasons } = context
  if (!ticket.supervisorReassignment) return
  const at = atHours(times.taken, ticket.supervisorReassignment.afterHours)
  const reasonId = reasons.id(
    'supervisor_reassignment',
    ticket.supervisorReassignment.reason,
  )
  await client.query(
    `update public.ticket_assignments set ended_at = $2
     where ticket_id = $1 and stage = 'supervisor' and ended_at is null`,
    [ticket.id, at],
  )
  await client.query(
    `insert into public.ticket_assignments (
       ticket_id, cycle, stage, assignee_user_id, assigned_by, assigned_at,
       reason_id
     ) values ($1, 1, 'supervisor', $2, $2, $3, $4)`,
    [ticket.id, people.supervisorId, at, reasonId],
  )
}

function reassignment(context: TicketContext) {
  if (!context.ticket.reassignment) return undefined
  return {
    at: reassignedAt(context, context.ticket.reassignment.afterHours),
    technicianId:
      context.people.technicians[context.ticket.reassignment.technician],
  }
}

async function insertReopenedAssignment(context: TicketContext) {
  const { client, ticket, people, times } = context
  if (!ticket.reopen) return
  const secondTechnician = ticket.reopen.technician
    ? people.technicians[ticket.reopen.technician]
    : activeTechnicianId(context)
  await client.query(
    `insert into public.ticket_assignments (
       ticket_id, cycle, stage, assignee_technician_id, assigned_by,
       assigned_at, ended_at
     ) values ($1, 2, 'technician', $2, $3, $4, $5)`,
    [
      ticket.id,
      secondTechnician,
      people.supervisorId,
      times.reopen?.resolvedAt,
      times.reopen?.validated ?? null,
    ],
  )
}

async function insertTechnicianAssignments(context: TicketContext) {
  const { client, ticket, people, times, ids } = context
  const firstEnd = ticket.reopen ? times.validated : finalAt(context)
  const reassign = reassignment(context)
  await client.query(
    `insert into public.ticket_assignments (
       ticket_id, cycle, stage, assignee_technician_id, assigned_by,
       assigned_at, ended_at
     ) values ($1, 1, 'technician', $2, $3, $4, $5)`,
    [
      ticket.id,
      ids.technicianId,
      people.supervisorId,
      times.assigned,
      reassign?.at ?? firstEnd ?? null,
    ],
  )
  if (reassign) {
    await client.query(
      `insert into public.ticket_assignments (
         ticket_id, cycle, stage, assignee_technician_id, assigned_by,
         assigned_at, ended_at
       ) values ($1, 1, 'technician', $2, $3, $4, $5)`,
      [
        ticket.id,
        reassign.technicianId,
        people.supervisorId,
        reassign.at,
        firstEnd ?? null,
      ],
    )
  }
  await insertReopenedAssignment(context)
}

export async function insertAssignments(context: TicketContext) {
  if (context.stage < 1) return
  await insertSupervisorAssignment(context)
  await insertSupervisorReassignment(context)
  if (context.stage >= 2) await insertTechnicianAssignments(context)
}

async function insertLeaderParticipants(context: TicketContext) {
  const { client, ticket, ids, people, times } = context
  const participation =
    ticket.leaderParticipation === 'auxiliary' ? 'auxiliary' : 'leader'
  const leaderEnd = ticket.reopen ? times.validated : finalAt(context)
  const reassign = reassignment(context)
  await client.query(
    `insert into public.ticket_participants (
       ticket_id, cycle, technician_id, participation_type, category_id,
       started_at, ended_at
     ) values ($1, 1, $2, $3::public.participation_type, $4, $5, $6)`,
    [
      ticket.id,
      ids.technicianId,
      participation,
      ids.categoryId,
      times.assigned,
      reassign?.at ?? leaderEnd ?? null,
    ],
  )
  if (reassign) {
    const reassigned = ticket.reassignment?.technician
    if (reassigned) {
      await client.query(
        `insert into public.ticket_participants (
           ticket_id, cycle, technician_id, participation_type, category_id,
           started_at, ended_at
         ) values ($1, 1, $2, $3::public.participation_type, $4, $5, $6)`,
        [
          ticket.id,
          people.technicians[reassigned],
          participation,
          ids.categoryId,
          reassign.at,
          leaderEnd ?? null,
        ],
      )
    }
  }
}

async function insertAuxiliaryParticipant(context: TicketContext) {
  const { client, ticket, ids, times } = context
  if (!ticket.auxiliary || !ids.auxiliaryTechnicianId) return
  if (ids.auxiliaryTechnicianId === activeTechnicianId(context)) return
  await client.query(
    `insert into public.ticket_participants (
       ticket_id, cycle, technician_id, participation_type, category_id,
       started_at, ended_at
     ) values ($1, 1, $2, 'auxiliary', $3, $4, $5)`,
    [
      ticket.id,
      ids.auxiliaryTechnicianId,
      ids.categoryId,
      atHours(times.started, 0.2),
      (ticket.reopen ? times.validated : finalAt(context)) ?? null,
    ],
  )
}

async function insertReopenedParticipant(context: TicketContext) {
  const { client, ticket, ids, people, times } = context
  if (!ticket.reopen) return
  const secondTechnician = ticket.reopen.technician
    ? people.technicians[ticket.reopen.technician]
    : activeTechnicianId(context)
  await client.query(
    `insert into public.ticket_participants (
       ticket_id, cycle, technician_id, participation_type, category_id,
       started_at, ended_at
     ) values ($1, 2, $2, 'leader', $3, $4, $5)`,
    [
      ticket.id,
      secondTechnician,
      ids.categoryId,
      times.reopen?.resolvedAt,
      times.reopen?.validated ?? null,
    ],
  )
}

export async function insertParticipants(context: TicketContext) {
  if (context.stage < 2) return
  await insertLeaderParticipants(context)
  await insertAuxiliaryParticipant(context)
  await insertReopenedParticipant(context)
}
