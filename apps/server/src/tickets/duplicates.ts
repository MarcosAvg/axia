import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { iso } from './format.js'
import { scopePredicate } from './scope.js'

export type DuplicateCandidate = {
  folio: string
  status: string
  reported_at: string
  building: string | null
  problem: string | null
  requester_contact: string | null
}

export type DuplicateCheckInput = {
  buildingId: string
  categoryId: string
  problemId?: string | null
  description: string
}

export async function checkDuplicateCandidates(
  db: Database,
  actor: Actor,
  input: DuplicateCheckInput,
): Promise<DuplicateCandidate[]> {
  const result = await db.execute(sql`
    select
      t.folio,
      t.status,
      t.reported_at,
      b.name as building,
      p.name as problem,
      t.requester_contact
    from public.tickets t
    join public.requesters r on r.id = t.requester_id
    left join public.buildings b on b.id = t.building_id
    left join public.problems p on p.id = t.problem_id
    where ${scopePredicate(actor, 'ticket.view')}
      and t.status not in ('closed', 'rejected', 'cancelled', 'duplicate')
      and t.building_id = ${input.buildingId}
      and (
        t.problem_id is not distinct from ${input.problemId ?? null}
        or t.category_id = ${input.categoryId}
      )
      and t.reported_at > now() - (
        select duplicate_window from public.instance_settings limit 1
      )
      and extensions.similarity(t.description, ${input.description}) >= (
        select duplicate_similarity from public.instance_settings limit 1
      )
    order by t.reported_at desc
    limit 10
  `)
  return (
    result.rows as Array<{
      folio: string
      status: string
      reported_at: Date | string
      building: string | null
      problem: string | null
      requester_contact: string | null
    }>
  ).map((row) => ({
    folio: row.folio,
    status: row.status,
    reported_at: iso(row.reported_at),
    building: row.building,
    problem: row.problem,
    requester_contact: row.requester_contact,
  }))
}
