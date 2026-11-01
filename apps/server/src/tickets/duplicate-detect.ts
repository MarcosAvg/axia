import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import { iso } from './format.js'

export type DuplicateSettings = {
  windowDays: number
  similarity: number
  shownFields: string[]
}

export type DuplicateInput = {
  buildingId: string
  locationId?: string | null
  categoryId: string
  subcategoryId?: string | null
  problemId?: string | null
  dependencyId?: string | null
  description: string
  reportedAt: string
  excludeTicketId?: string | null
}

export type DuplicateCheckInput = Omit<
  DuplicateInput,
  'reportedAt' | 'excludeTicketId'
>

export type ScoredCandidate = {
  id: string
  folio: string
  status: string
  reportedAt: string
  building: string | null
  location: string | null
  problem: string | null
  subcategory: string | null
  dependency: string | null
  requesterContact: string | null
  similarity: number
  score: number
  reasons: string[]
}

type ScoredRow = {
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
  same_location: boolean
  same_problem: boolean
  same_subcategory: boolean
  same_dependency: boolean
}

function toCandidate(row: ScoredRow): ScoredCandidate {
  const reasons: string[] = []
  if (row.same_location) reasons.push('location')
  if (row.same_problem) reasons.push('problem')
  if (row.same_subcategory) reasons.push('subcategory')
  if (row.same_dependency) reasons.push('dependency')
  return {
    id: row.id,
    folio: row.folio,
    status: row.status,
    reportedAt: iso(row.reported_at),
    building: row.building,
    location: row.location,
    problem: row.problem,
    subcategory: row.subcategory,
    dependency: row.dependency,
    requesterContact: row.requester_contact,
    similarity: Number(row.similarity),
    score: Number(row.score),
    reasons,
  }
}

/**
 * Busca candidatos en tiquets no finales del mismo edificio y de la ventana
 * configurada. El puntaje combina texto normalizado y coincidencias exactas de
 * ubicación, problema, subcategoría y dependencia.
 */
function candidateIds(input: DuplicateInput) {
  return {
    locationId: input.locationId ?? null,
    problemId: input.problemId ?? null,
    subcategoryId: input.subcategoryId ?? null,
    dependencyId: input.dependencyId ?? null,
    excludeId: input.excludeTicketId ?? null,
  }
}

export async function findDuplicateCandidates(
  executor: Pick<Database, 'execute'>,
  input: DuplicateInput,
  settings: DuplicateSettings,
  limit = 10,
): Promise<ScoredCandidate[]> {
  const { locationId, problemId, subcategoryId, dependencyId, excludeId } =
    candidateIds(input)
  const result = await executor.execute(sql`
    with scored as (select
        t.id, t.folio, t.status, t.reported_at,
        b.name as building, l.name as location, p.name as problem,
        s.name as subcategory, d.name as dependency, t.requester_contact,
        extensions.similarity(
          lower(translate(coalesce(t.description, ''), 'áéíóúü', 'aeiouu')),
          lower(translate(${input.description}, 'áéíóúü', 'aeiouu'))
        ) as similarity,
        (${locationId}::uuid is not null
          and t.location_id = ${locationId}) as same_location,
        (${problemId}::uuid is not null
          and t.problem_id = ${problemId}) as same_problem,
        (${subcategoryId}::uuid is not null
          and t.subcategory_id = ${subcategoryId}) as same_subcategory,
        (${dependencyId}::uuid is not null
          and t.dependency_id = ${dependencyId}) as same_dependency
      from public.tickets t
      left join public.buildings b on b.id = t.building_id
      left join public.locations l on l.id = t.location_id
      left join public.problems p on p.id = t.problem_id
      left join public.subcategories s on s.id = t.subcategory_id
      left join public.dependencies d on d.id = t.dependency_id
      where (${excludeId}::uuid is null or t.id <> ${excludeId})
        and t.status not in ('closed', 'rejected', 'cancelled', 'duplicate')
        and t.building_id = ${input.buildingId}
        and (t.problem_id is not distinct from ${problemId}
          or t.category_id = ${input.categoryId})
        and t.reported_at between ${input.reportedAt}::timestamptz
          - make_interval(days => ${settings.windowDays})
          and ${input.reportedAt}::timestamptz
          + make_interval(days => ${settings.windowDays})
    )
    select candidate.* from (
      select
        scored.*,
        round((
          0.35 * scored.similarity
          + case when scored.same_location then 0.25 else 0 end
          + case when scored.same_problem then 0.3 else 0 end
          + case when scored.same_subcategory then 0.05 else 0 end
          + case when scored.same_dependency then 0.05 else 0 end
        )::numeric, 3) as score
      from scored
    ) candidate
    where (candidate.same_location and candidate.same_problem)
      or candidate.similarity >= ${settings.similarity}
    order by candidate.score desc, candidate.reported_at desc
    limit ${limit}
  `)
  return (result.rows as ScoredRow[]).map(toCandidate)
}
