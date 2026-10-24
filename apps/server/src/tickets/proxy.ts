import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { AppError } from '../http/errors.js'
import { can, getPermissionScope, type TicketAccess } from './access.js'
import type { DbExecutor } from './db.js'
import { assertTicketAction } from './repository.js'

type TechnicianRow = {
  id: string
  team_id: string
}

type SubjectCheck = {
  db: DbExecutor
  actor: Actor
  access: TicketAccess
  subjectTechnicianId: string
  requireParticipant: boolean
}

type TechnicianActionCheck = {
  db: DbExecutor
  actor: Actor
  access: TicketAccess
  permission: string
  subjectTechnicianId?: string | null
  requireParticipant?: boolean
}

function forbidden(message: string): AppError {
  return new AppError(403, 'forbidden', message)
}

async function loadActiveTechnician(
  db: DbExecutor,
  technicianId: string,
): Promise<TechnicianRow> {
  const result = await db.execute(sql`
    select id, team_id
    from public.technicians
    where id = ${technicianId} and active
    limit 1
  `)
  const technician = result.rows[0] as TechnicianRow | undefined
  if (!technician) {
    throw new AppError(400, 'validation', 'Técnico no válido')
  }
  return technician
}

async function participatesInTicket(
  db: DbExecutor,
  ticketId: string,
  technicianId: string,
): Promise<boolean> {
  const result = await db.execute(sql`
    select (
      exists (
        select 1
        from public.ticket_participants
        where ticket_id = ${ticketId}
          and technician_id = ${technicianId}
          and ended_at is null
      )
      or exists (
        select 1
        from public.ticket_assignments
        where ticket_id = ${ticketId}
          and assignee_technician_id = ${technicianId}
          and ended_at is null
      )
    ) as participates
  `)
  return Boolean(
    (result.rows[0] as { participates: boolean } | undefined)?.participates,
  )
}

/** Valida el alcance de `act_on_behalf` y que el técnico participe en el tiquet. */
async function assertSubject({
  db,
  actor,
  access,
  subjectTechnicianId,
  requireParticipant,
}: SubjectCheck): Promise<void> {
  if (!can(actor, 'ticket.view', access)) {
    throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  }
  const scope = getPermissionScope(actor, 'act_on_behalf')
  if (!scope) throw forbidden('No tienes permiso para actuar a nombre de otro')

  const technician = await loadActiveTechnician(db, subjectTechnicianId)
  if (scope === 'all') {
    // El administrador puede atribuir la acción a cualquier técnico activo.
  } else if (scope === 'team') {
    if (!actor.teamIds.includes(technician.team_id)) {
      throw forbidden('El técnico no pertenece a tus equipos')
    }
  } else {
    throw forbidden('No tienes permiso para actuar a nombre de otro')
  }

  if (
    requireParticipant &&
    !(await participatesInTicket(db, access.id, subjectTechnicianId))
  ) {
    throw new AppError(
      400,
      'validation',
      'El técnico no participa en el tiquet',
    )
  }
}

/**
 * Comprueba la acción del técnico: con sujeto valida el proxy; sin sujeto exige
 * el permiso directo de la acción.
 */
export async function assertTechnicianAction({
  db,
  actor,
  access,
  permission,
  subjectTechnicianId,
  requireParticipant = true,
}: TechnicianActionCheck): Promise<void> {
  if (subjectTechnicianId) {
    await assertSubject({
      db,
      actor,
      access,
      subjectTechnicianId,
      requireParticipant,
    })
    return
  }
  assertTicketAction(actor, permission, access)
}
