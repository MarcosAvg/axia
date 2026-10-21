import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { iso } from './format.js'
import { findVisibleTicket } from './repository.js'

export type PauseStepItem = {
  pauseId: string
  reasonId: string
  reasonName: string
  enteredAt: string
  exitedAt: string | null
  note: string | null
  actorName: string | null
}

export type PauseStateItem = {
  pauseId: string
  motiveId: string
  motiveName: string
  currentId: string
  currentName: string
  openedAt: string
}

type StepRow = {
  pause_id: string
  reason_id: string
  reason_name: string
  entered_at: Date | string
  exited_at: Date | string | null
  note: string | null
  actor_name: string | null
}

type StateRow = {
  pause_id: string
  motive_id: string
  motive_name: string
  current_id: string
  current_name: string
  opened_at: Date | string
}

export async function getPauseSteps(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<PauseStepItem[] | null> {
  if (!(await findVisibleTicket(db, actor, ticketId))) return null
  const result = await db.execute(sql`
    select
      ps.pause_id, ps.reason_id, r.name as reason_name,
      ps.entered_at, ps.exited_at, ps.note, u.full_name as actor_name
    from public.ticket_pause_steps ps
    join public.reasons r on r.id = ps.reason_id
    left join public.users u on u.id = ps.actor_id
    join public.ticket_pauses p on p.id = ps.pause_id
    where p.ticket_id = ${ticketId}
    order by ps.entered_at, ps.id
  `)
  return (result.rows as StepRow[]).map((row) => ({
    pauseId: row.pause_id,
    reasonId: row.reason_id,
    reasonName: row.reason_name,
    enteredAt: iso(row.entered_at),
    exitedAt: row.exited_at === null ? null : iso(row.exited_at),
    note: row.note,
    actorName: row.actor_name,
  }))
}

export async function getPauseState(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<PauseStateItem | null | undefined> {
  if (!(await findVisibleTicket(db, actor, ticketId))) return undefined
  const result = await db.execute(sql`
    select
      p.id as pause_id,
      p.root_reason_id as motive_id,
      root.name as motive_name,
      p.reason_id as current_id,
      current.name as current_name,
      p.opened_at
    from public.ticket_pauses p
    join public.reasons root on root.id = p.root_reason_id
    join public.reasons current on current.id = p.reason_id
    where p.ticket_id = ${ticketId} and p.closed_at is null
    order by p.opened_at desc
    limit 1
  `)
  const row = result.rows[0] as StateRow | undefined
  if (!row) return null
  return {
    pauseId: row.pause_id,
    motiveId: row.motive_id,
    motiveName: row.motive_name,
    currentId: row.current_id,
    currentName: row.current_name,
    openedAt: iso(row.opened_at),
  }
}
