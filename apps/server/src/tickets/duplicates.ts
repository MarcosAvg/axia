import { sql } from 'drizzle-orm'

import type { Database } from '../db/client.js'
import type { DbExecutor } from './db.js'
import {
  findDuplicateCandidates,
  type DuplicateCheckInput,
  type DuplicateInput,
  type DuplicateSettings,
  type ScoredCandidate,
} from './duplicate-detect.js'

export type {
  DuplicateCheckInput,
  DuplicateSettings,
  ScoredCandidate,
} from './duplicate-detect.js'

/** Campos que la configuración puede mostrar de un candidato. */
export const DUPLICATE_SHOWN_FIELDS = [
  'folio',
  'status',
  'reported_at',
  'building',
  'location',
  'problem',
  'subcategory',
  'dependency',
  'requester_contact',
] as const
type DuplicateShownField = (typeof DUPLICATE_SHOWN_FIELDS)[number]

const DEFAULT_FIELDS: DuplicateShownField[] = [
  'folio',
  'status',
  'reported_at',
  'building',
  'problem',
  'requester_contact',
]

const FIELD_SOURCES: Record<DuplicateShownField, keyof ScoredCandidate> = {
  folio: 'folio',
  status: 'status',
  reported_at: 'reportedAt',
  building: 'building',
  location: 'location',
  problem: 'problem',
  subcategory: 'subcategory',
  dependency: 'dependency',
  requester_contact: 'requesterContact',
}

type SettingsRow = {
  window_days: number
  similarity: string | number
  fields: string[] | null
}

/** Parámetros vigentes de detección; si falta la fila se usan los valores semilla. */
export async function duplicateSettings(
  executor: Pick<Database, 'execute'>,
): Promise<DuplicateSettings> {
  const result = await executor.execute(sql`
    select
      extract(day from duplicate_window)::int as window_days,
      duplicate_similarity as similarity,
      duplicate_shown_fields as fields
    from public.instance_settings
    limit 1
  `)
  const row = result.rows[0] as SettingsRow | undefined
  return {
    windowDays: row?.window_days ?? 7,
    similarity: Number(row?.similarity ?? 0.3),
    shownFields: row?.fields?.length ? row.fields : DEFAULT_FIELDS,
  }
}

/** Proyección pública según los campos que la configuración permite mostrar. */
export function projectCandidate(
  candidate: ScoredCandidate,
  shownFields: string[],
): Record<string, unknown> {
  const item: Record<string, unknown> = {
    id: candidate.id,
    similarity: candidate.similarity,
    score: candidate.score,
    reasons: candidate.reasons,
  }
  for (const field of DUPLICATE_SHOWN_FIELDS) {
    if (!shownFields.includes(field)) continue
    item[field] = candidate[FIELD_SOURCES[field]]
  }
  return item
}

/** Aviso previo al registro; no persiste ni bloquea. */
export async function checkDuplicateCandidates(
  executor: Pick<Database, 'execute'>,
  input: DuplicateCheckInput,
): Promise<Record<string, unknown>[]> {
  const settings = await duplicateSettings(executor)
  const candidates = await findDuplicateCandidates(
    executor,
    { ...input, reportedAt: new Date().toISOString() },
    settings,
  )
  return candidates.map((candidate) =>
    projectCandidate(candidate, settings.shownFields),
  )
}

/** Guarda los candidatos detectados al crear o recapturar un tiquet. */
export async function storeDuplicateCandidates(
  executor: DbExecutor,
  ticketId: string,
  candidates: ScoredCandidate[],
): Promise<void> {
  for (const candidate of candidates) {
    await executor.execute(sql`
      insert into public.ticket_duplicate_candidates (
        ticket_id, candidate_ticket_id, similarity, score, reasons
      ) values (
        ${ticketId}, ${candidate.id}, ${candidate.similarity},
        ${candidate.score},
        string_to_array(${candidate.reasons.join(',')}, ',')::text[]
      )
      on conflict (ticket_id, candidate_ticket_id) do update
        set
          similarity = excluded.similarity,
          score = excluded.score,
          reasons = excluded.reasons
        where ticket_duplicate_candidates.decision is null
    `)
  }
}

/** Marca como ignorados los candidatos que la persona vio y decidió omitir. */
async function recordIgnoredCandidates(
  executor: DbExecutor,
  ticketId: string,
  actorId: string,
  candidateIds: string[],
): Promise<void> {
  if (candidateIds.length === 0) return
  await executor.execute(sql`
    update public.ticket_duplicate_candidates
    set decision = 'ignored', decided_by = ${actorId}, decided_at = now()
    where ticket_id = ${ticketId}
      and decision is null
      and candidate_ticket_id = any(
        string_to_array(${candidateIds.join(',')}, ',')::uuid[]
      )
  `)
}

/** El tiquet se enlazó al candidato; el resto de alertas queda descartado. */
export async function linkCandidate(
  executor: DbExecutor,
  ticketId: string,
  actorId: string,
  candidateId: string,
): Promise<void> {
  await executor.execute(sql`
    update public.ticket_duplicate_candidates
    set decision = 'linked', decided_by = ${actorId}, decided_at = now()
    where ticket_id = ${ticketId}
      and candidate_ticket_id = ${candidateId}
      and (decision is null or decision = 'ignored')
  `)
  await dismissPendingCandidates(executor, ticketId, actorId)
}

/** Descarta las alertas pendientes: no era duplicado. */
export async function dismissPendingCandidates(
  executor: DbExecutor,
  ticketId: string,
  actorId: string,
): Promise<void> {
  await executor.execute(sql`
    update public.ticket_duplicate_candidates
    set decision = 'dismissed', decided_by = ${actorId}, decided_at = now()
    where ticket_id = ${ticketId} and decision is null
  `)
}

export type DuplicateDetection = {
  ticketId: string
  input: DuplicateInput
  actorId: string
  shownCandidateIds?: string[]
}

/** Detecta, guarda y refleja el flag de posible duplicado al crear o recapturar. */
export async function detectAndStoreDuplicates(
  executor: DbExecutor,
  detection: DuplicateDetection,
): Promise<void> {
  const { ticketId, input, actorId, shownCandidateIds } = detection
  const settings = await duplicateSettings(executor)
  const candidates = await findDuplicateCandidates(executor, input, settings)
  await storeDuplicateCandidates(executor, ticketId, candidates)
  if (shownCandidateIds?.length) {
    await recordIgnoredCandidates(
      executor,
      ticketId,
      actorId,
      shownCandidateIds,
    )
  }
  await executor.execute(sql`
    update public.tickets
    set possible_duplicate = ${candidates.length > 0}
    where id = ${ticketId}
  `)
}
