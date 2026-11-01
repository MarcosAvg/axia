import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  dismissPendingCandidates,
  duplicateSettings,
  projectCandidate,
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
