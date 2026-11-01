import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { findDuplicateCandidates } from './duplicate-detect.js'
import {
  dismissPendingCandidates,
  duplicateSettings,
  projectCandidate,
  storeDuplicateCandidates,
  type ScoredCandidate,
} from './duplicates.js'
import { optionalIso } from './format.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

type AlertRow = {
  id: string
  folio: string
  status: string
  reported_at: Date | string
  building: string | null
  location: string | null
  problem: string | null
  subcategory: string | null
  dependency: string | null
  requester_contact: string | null
  similarity: string | number
  score: string | number
  reasons: string[]
  decision: string | null
  decided_at: Date | string | null
}

function toScored(row: AlertRow): ScoredCandidate {
  return {
    id: row.id,
    folio: row.folio,
    status: row.status,
    reportedAt: new Date(row.reported_at).toISOString(),
    building: row.building,
    location: row.location,
    problem: row.problem,
    subcategory: row.subcategory,
    dependency: row.dependency,
    requesterContact: row.requester_contact,
    similarity: Number(row.similarity),
    score: Number(row.score),
    reasons: row.reasons ?? [],
  }
}

/** Alertas guardadas de un tiquet, con su decisión y los campos configurados. */
export async function listDuplicateAlerts(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<Record<string, unknown>[]> {
  const access = await findVisibleTicket(db, actor, ticketId)
  if (!access) throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  const settings = await duplicateSettings(db)
  const result = await db.execute(sql`
    select
      c.candidate_ticket_id as id,
      c.similarity,
      c.score,
      c.reasons,
      c.decision,
      c.decided_at,
      t.folio,
      t.status,
      t.reported_at,
      t.requester_contact,
      b.name as building,
      l.name as location,
      p.name as problem,
      s.name as subcategory,
      d.name as dependency
    from public.ticket_duplicate_candidates c
    join public.tickets t on t.id = c.candidate_ticket_id
    left join public.buildings b on b.id = t.building_id
    left join public.locations l on l.id = t.location_id
    left join public.problems p on p.id = t.problem_id
    left join public.subcategories s on s.id = t.subcategory_id
    left join public.dependencies d on d.id = t.dependency_id
    where c.ticket_id = ${ticketId}
    order by c.score desc, c.shown_at desc
  `)
  return (result.rows as AlertRow[]).map((row) => ({
    ...projectCandidate(toScored(row), settings.shownFields),
    decision: row.decision,
    decided_at: optionalIso(row.decided_at),
  }))
}

/** Descarta todas las alertas pendientes: el revisor determinó que no es duplicado. */
export async function dismissDuplicateAlerts(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<void> {
  const access = await findVisibleTicket(db, actor, ticketId)
  if (!access) throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  assertTicketAction(actor, 'ticket.mark_duplicate', access)
  await db.transaction(async (tx) => {
    await dismissPendingCandidates(tx, ticketId, actor.id)
    await tx.execute(sql`
      update public.tickets
      set possible_duplicate = false
      where id = ${ticketId}
    `)
  })
}

type CaptureRow = {
  id: string
  building_id: string
  location_id: string
  dependency_id: string
  category_id: string
  subcategory_id: string | null
  problem_id: string | null
  description: string
  reported_at: Date | string
}

/**
 * Recalcula las alertas pendientes de los tiquets no finales. Útil al estrenar
 * la detección o tras cambiar la configuración de duplicados.
 */
export async function backfillDuplicateAlerts(
  db: Database,
): Promise<{ tickets: number; flagged: number; alerts: number }> {
  const settings = await duplicateSettings(db)
  const result = await db.execute(sql`
    select id, building_id, location_id, dependency_id, category_id,
      subcategory_id, problem_id, description, reported_at
    from public.tickets
    where status not in ('closed', 'rejected', 'cancelled', 'duplicate')
    order by reported_at
  `)
  const tickets = result.rows as CaptureRow[]
  let flagged = 0
  let alerts = 0
  for (const ticket of tickets) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        delete from public.ticket_duplicate_candidates
        where ticket_id = ${ticket.id} and decision is null
      `)
      const candidates = await findDuplicateCandidates(
        tx,
        {
          buildingId: ticket.building_id,
          locationId: ticket.location_id,
          categoryId: ticket.category_id,
          subcategoryId: ticket.subcategory_id,
          problemId: ticket.problem_id,
          dependencyId: ticket.dependency_id,
          description: ticket.description,
          reportedAt: new Date(ticket.reported_at).toISOString(),
          excludeTicketId: ticket.id,
        },
        settings,
      )
      await storeDuplicateCandidates(tx, ticket.id, candidates)
      await tx.execute(sql`
        update public.tickets
        set possible_duplicate = exists (
          select 1 from public.ticket_duplicate_candidates
          where ticket_id = ${ticket.id}
        )
        where id = ${ticket.id}
      `)
      alerts += candidates.length
      if (candidates.length > 0) flagged += 1
    })
  }
  return { tickets: tickets.length, flagged, alerts }
}
