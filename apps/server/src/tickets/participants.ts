import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { iso } from './format.js'
import { findVisibleTicket } from './repository.js'

export type ParticipantItem = {
  technicianId: string
  technicianName: string
  participationType: 'leader' | 'auxiliary'
  startedAt: string
  endedAt: string | null
}

type ParticipantRow = {
  technician_id: string
  technician_name: string
  participation_type: 'leader' | 'auxiliary'
  started_at: Date | string
  ended_at: Date | string | null
}

export async function listParticipants(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<ParticipantItem[] | null> {
  const access = await findVisibleTicket(db, actor, ticketId)
  if (!access) return null

  const result = await db.execute(sql`
    select
      p.technician_id,
      te.full_name as technician_name,
      p.participation_type,
      p.started_at,
      p.ended_at
    from public.ticket_participants p
    join public.technicians te on te.id = p.technician_id
    where p.ticket_id = ${ticketId}
    order by p.started_at, p.id
  `)

  return (result.rows as ParticipantRow[]).map((row) => ({
    technicianId: row.technician_id,
    technicianName: row.technician_name,
    participationType: row.participation_type,
    startedAt: iso(row.started_at),
    endedAt: row.ended_at === null ? null : iso(row.ended_at),
  }))
}
