import { sql } from 'drizzle-orm'

import { AppError } from '../http/errors.js'
import type { DbExecutor } from './db.js'
import type { HandledEvent } from './events.js'

export type LockedTicket = {
  id: string
  status: string
  cycle: number
  category_id: string
  team_id: string
}

export type ActionResult = {
  ticketId: string
  action: string
  replayed: boolean
}

export function notFound(): AppError {
  return new AppError(404, 'not_found', 'Tiquet no encontrado')
}

export function conflict(message: string): AppError {
  return new AppError(409, 'conflict', message)
}

export function forbidden(message: string): AppError {
  return new AppError(403, 'forbidden', message)
}

function replay(handled: HandledEvent, action: string): ActionResult {
  return {
    ticketId: handled.ticketId,
    action,
    replayed: true,
  }
}

export function validateHandled(
  handled: HandledEvent | null,
  ticketId: string,
  expected: string,
  action: string,
): ActionResult | null {
  if (!handled) return null
  if (handled.type !== expected || handled.ticketId !== ticketId) {
    throw conflict('La clave de idempotencia ya se usó para otra acción')
  }
  return replay(handled, action)
}

export async function lockTicket(
  tx: DbExecutor,
  ticketId: string,
): Promise<LockedTicket> {
  const result = await tx.execute(sql`
    select id, status, cycle, category_id, team_id
    from public.tickets
    where id = ${ticketId}
    for update
  `)
  const row = result.rows[0] as LockedTicket | undefined
  if (!row) throw notFound()
  return row
}

export function isFinalStatus(status: string): boolean {
  return ['closed', 'rejected', 'cancelled', 'duplicate'].includes(status)
}

export async function requireReason(
  tx: DbExecutor,
  reasonId: string,
  use: string,
  label: string,
) {
  const result = await tx.execute(sql`
    select id
    from public.reasons
    where id = ${reasonId} and active and use = ${use}
    limit 1
  `)
  if (!result.rows[0]) {
    throw new AppError(400, 'validation_error', `${label} no válido`)
  }
}

export async function hasEvidence(
  tx: DbExecutor,
  ticketId: string,
  cycle: number,
  type: string,
): Promise<boolean> {
  const result = await tx.execute(sql`
    select 1
    from public.evidence
    where ticket_id = ${ticketId} and cycle = ${cycle} and type = ${type}
    limit 1
  `)
  return Boolean(result.rows[0])
}
