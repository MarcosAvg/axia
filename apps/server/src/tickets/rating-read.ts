import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { findVisibleTicket } from './repository.js'

export type RatingItem = { score: number; comment: string | null }

export async function getRating(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<RatingItem | null | undefined> {
  if (!(await findVisibleTicket(db, actor, ticketId))) return undefined
  const result = await db.execute(sql`
    select score, comment from public.ticket_ratings
    where ticket_id = ${ticketId} limit 1
  `)
  const row = result.rows[0] as
    { score: number; comment: string | null } | undefined
  return row ?? null
}
