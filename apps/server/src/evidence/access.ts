import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { can as hasPermission } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { isFinalStatus } from '../tickets/action-shared.js'
import { assertTechnicianAction } from '../tickets/proxy.js'
import { findVisibleTicket } from '../tickets/repository.js'
import { canAct, type TicketAccess } from '../tickets/access.js'
import type { CreateEvidenceInput } from './schemas.js'

export type EvidenceType = CreateEvidenceInput['type']

const WORK_TYPES = new Set<EvidenceType>(['before', 'during', 'after'])

function canAttachRequest(actor: Actor, access: TicketAccess): boolean {
  const ownsTicket =
    access.requesterUserId === actor.id || access.registeredBy === actor.id
  const canCreate =
    hasPermission(actor, 'ticket.create') ||
    hasPermission(actor, 'ticket.create_on_behalf')
  return ownsTicket && canCreate
}

/**
 * Autoriza la evidencia por tipo y por la acción que la justifica:
 * - `claim`: abrir una reclamación.
 * - `request`: crear el tiquet o registrarlo a nombre de otra persona.
 * - `before`/`during`/`after`: registrar el avance del trabajo.
 * - `other`: adjuntar evidencia fuera del flujo.
 * `evidence.attach` sigue habilitando cualquier tipo para supervisores y administradores.
 */
export function canAttachEvidence(
  actor: Actor,
  access: TicketAccess,
  type: EvidenceType,
): boolean {
  if (canAct(actor, 'evidence.attach', access)) return true
  if (type === 'claim') {
    return (
      canAct(actor, 'ticket.open_claim', access) ||
      canAct(actor, 'ticket.open_claim_on_behalf', access)
    )
  }
  if (type === 'request') return canAttachRequest(actor, access)
  if (WORK_TYPES.has(type)) {
    return canAct(actor, 'ticket.record_progress', access)
  }
  return false
}

function forbidden(): AppError {
  return new AppError(
    403,
    'forbidden',
    'No tienes permiso para adjuntar evidencia',
  )
}

async function assertEvidenceSubject(
  db: Database,
  actor: Actor,
  access: TicketAccess,
  input: CreateEvidenceInput,
) {
  if (input.subjectTechnicianId) {
    if (!WORK_TYPES.has(input.type)) {
      throw new AppError(
        400,
        'validation',
        'El sujeto técnico solo aplica a evidencia de trabajo',
      )
    }
    await assertTechnicianAction({
      db,
      actor,
      access,
      permission: 'ticket.record_progress',
      subjectTechnicianId: input.subjectTechnicianId,
    })
    return
  }
  if (!canAttachEvidence(actor, access, input.type)) {
    throw forbidden()
  }
}

function isOfflineWork(input: CreateEvidenceInput): boolean {
  return Boolean(input.clientCapturedAt && WORK_TYPES.has(input.type))
}

function finalTicketError(status?: string): AppError {
  return new AppError(409, 'evidence_ticket_final', 'El tiquet ya terminó', {
    details: status ? { status } : undefined,
  })
}

/** El alcance histórico solo confirma el rechazo de una captura del ciclo cerrado. */
async function wasWorkingAtClose(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: CreateEvidenceInput,
): Promise<boolean> {
  if (!isOfflineWork(input) || !actor.technicianId || !input.cycle) return false
  const result = await db.execute(sql`
    select t.status
    from public.tickets t
    join public.ticket_participants p
      on p.ticket_id = t.id and p.cycle = t.cycle and p.ended_at = t.closed_at
    where t.id = ${ticketId}
      and p.technician_id = ${actor.technicianId}
      and t.cycle = ${input.cycle}
    limit 1
  `)
  const row = result.rows[0] as { status: string } | undefined
  return Boolean(row && isFinalStatus(row.status))
}

export async function evidenceAccess(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: CreateEvidenceInput,
) {
  const access = await findVisibleTicket(db, actor, ticketId)
  if (!access) {
    if (await wasWorkingAtClose(db, actor, ticketId, input))
      throw finalTicketError()
    throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  }
  if (isOfflineWork(input) && isFinalStatus(access.status)) {
    throw finalTicketError(access.status)
  }
  await assertEvidenceSubject(db, actor, access, input)
}
