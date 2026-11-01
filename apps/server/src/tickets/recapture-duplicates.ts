import { sql } from 'drizzle-orm'

import type { DbExecutor } from './db.js'
import { findDuplicateCandidates } from './duplicate-detect.js'
import { duplicateSettings, storeDuplicateCandidates } from './duplicates.js'

type CaptureRow = {
  building_id: string
  location_id: string
  dependency_id: string
  category_id: string
  subcategory_id: string | null
  problem_id: string | null
  description: string
  reported_at: Date | string
}

/** Recalcula las alertas de duplicado tras corregir la captura. */
export async function refreshDuplicates(tx: DbExecutor, ticketId: string) {
  const result = await tx.execute(sql`
    select building_id, location_id, dependency_id, category_id,
      subcategory_id, problem_id, description, reported_at
    from public.tickets where id = ${ticketId}
  `)
  const capture = result.rows[0] as CaptureRow | undefined
  if (!capture) return
  const settings = await duplicateSettings(tx)
  await tx.execute(sql`
    delete from public.ticket_duplicate_candidates
    where ticket_id = ${ticketId} and decision is null
  `)
  const candidates = await findDuplicateCandidates(
    tx,
    {
      buildingId: capture.building_id,
      locationId: capture.location_id,
      categoryId: capture.category_id,
      subcategoryId: capture.subcategory_id,
      problemId: capture.problem_id,
      dependencyId: capture.dependency_id,
      description: capture.description,
      reportedAt: new Date(capture.reported_at).toISOString(),
      excludeTicketId: ticketId,
    },
    settings,
  )
  await storeDuplicateCandidates(tx, ticketId, candidates)
  await tx.execute(sql`
    update public.tickets
    set possible_duplicate = exists (
      select 1 from public.ticket_duplicate_candidates where ticket_id = ${ticketId}
    )
    where id = ${ticketId}
  `)
}
