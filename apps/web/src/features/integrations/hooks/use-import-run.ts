import type { TicketStatus } from '@/features/tickets'
import {
  addRecord,
  assignTicket,
  fetchInstanceTimezone,
  finishBatch,
  importTimeline,
  resolveAlias,
  resolveStatus,
  startBatch,
  upsertTicket,
} from '../api/import-run-api'
import { readRows } from '../adapters/read-file'
import {
  CATALOG_BY_NAME,
  CATALOG_LABEL,
  CATALOG_NAMES,
  toCandidates,
} from '../adapters/candidates'
import type { Candidate, CatalogName } from '../adapters/candidates'

export interface RowAnalysis {
  index: number
  raw: Record<string, unknown>
  candidate: Candidate
  resolved: Partial<Record<CatalogName, string>>
  unresolved: CatalogName[]
  status: TicketStatus | null
  kind: 'ok' | 'alias' | 'status' | 'invalid'
  issues: string[]
}

interface ImportReport {
  total: number
  ok: number
  alias: number
  status: number
  invalid: number
}

export interface AnalyzeResult {
  batchId: string
  rows: RowAnalysis[]
  report: ImportReport
}

const REQUIRED: CatalogName[] = [
  'building',
  'location',
  'dependency',
  'category',
  'serviceType',
  'priority',
  'channel',
  'requester',
]

interface Caches {
  alias: Map<string, string | null>
  status: Map<string, TicketStatus | null>
}

interface ResolvedRow {
  resolved: Partial<Record<CatalogName, string>>
  unresolved: CatalogName[]
  status: TicketStatus | null
  kind: RowAnalysis['kind']
  issues: string[]
}

function classify(
  candidate: Candidate,
  resolved: Partial<Record<CatalogName, string>>,
  unresolved: CatalogName[],
  statusMissing: boolean,
): RowAnalysis['kind'] {
  const missingRequired = REQUIRED.some((name) => !resolved[name])
  if (!candidate.externalId || !candidate.description || missingRequired) {
    return 'invalid'
  }
  if (statusMissing) return 'status'
  if (unresolved.length > 0) return 'alias'
  return 'ok'
}

async function aliasLookup(
  caches: Caches,
  name: CatalogName,
  value: string,
): Promise<string | null> {
  const key = `${CATALOG_BY_NAME[name]}|${value.toLowerCase()}`
  const cached = caches.alias.get(key)
  if (cached !== undefined) return cached
  const id = await resolveAlias(CATALOG_BY_NAME[name], value)
  caches.alias.set(key, id)
  return id
}

async function resolveCatalog(candidate: Candidate, caches: Caches) {
  const resolved: Partial<Record<CatalogName, string>> = {}
  const unresolved: CatalogName[] = []
  for (const name of CATALOG_NAMES) {
    const value = candidate.names[name]
    if (!value) continue
    const id = await aliasLookup(caches, name, value)
    if (id) resolved[name] = id
    else unresolved.push(name)
  }
  return { resolved, unresolved }
}

async function statusLookup(
  caches: Caches,
  system: string,
  text: string,
): Promise<TicketStatus | null> {
  const key = text.toLowerCase()
  if (!caches.status.has(key)) {
    caches.status.set(key, await resolveStatus(system, text))
  }
  return caches.status.get(key) ?? null
}

function collectIssues(
  candidate: Candidate,
  unresolved: CatalogName[],
  status: TicketStatus | null,
): string[] {
  const issues: string[] = []
  for (const name of unresolved) {
    issues.push(`Sin alias: ${CATALOG_LABEL[name]} «${candidate.names[name]}»`)
  }
  if (!status)
    issues.push(`Estatus sin mapear: «${candidate.statusText ?? '—'}»`)
  if (!candidate.externalId) issues.push('Falta el ID')
  if (!candidate.description) issues.push('Falta la descripción')
  for (const name of REQUIRED) {
    if (!candidate.names[name]) issues.push(`Falta ${CATALOG_LABEL[name]}`)
  }
  return issues
}

async function resolveRow(
  candidate: Candidate,
  system: string,
  caches: Caches,
): Promise<ResolvedRow> {
  const { resolved, unresolved } = await resolveCatalog(candidate, caches)
  const status = candidate.statusText
    ? await statusLookup(caches, system, candidate.statusText)
    : null
  return {
    resolved,
    unresolved,
    status,
    kind: classify(candidate, resolved, unresolved, !status),
    issues: collectIssues(candidate, unresolved, status),
  }
}

function summarize(rows: RowAnalysis[]): ImportReport {
  return {
    total: rows.length,
    ok: rows.filter((row) => row.kind === 'ok').length,
    alias: rows.filter((row) => row.kind === 'alias').length,
    status: rows.filter((row) => row.kind === 'status').length,
    invalid: rows.filter((row) => row.kind === 'invalid').length,
  }
}

function buildPayload(row: RowAnalysis): Record<string, unknown> {
  const resolved = row.resolved
  return {
    ticket_number: row.candidate.externalId,
    building_id: resolved.building,
    location_id: resolved.location,
    dependency_id: resolved.dependency,
    category_id: resolved.category,
    subcategory_id: resolved.subcategory,
    problem_id: resolved.problem,
    service_type_id: resolved.serviceType,
    priority_id: resolved.priority,
    channel_id: resolved.channel,
    requester_id: resolved.requester,
    requester_name: row.candidate.names.requester,
    requester_contact: row.candidate.extension,
    description: row.candidate.description,
    status: row.status,
    reported_at: row.candidate.reportedAt,
    closed_at: row.candidate.finishedAt,
  }
}

async function analyze(file: File, system: string): Promise<AnalyzeResult> {
  const timeZone = await fetchInstanceTimezone()
  const raw = await readRows(file)
  const candidates = toCandidates(raw, timeZone)
  const batchId = await startBatch(system, 'dry_run')
  const caches: Caches = { alias: new Map(), status: new Map() }
  const rows: RowAnalysis[] = []

  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index] as Candidate
    const row: RowAnalysis = {
      index,
      raw: raw[index] ?? {},
      candidate,
      ...(await resolveRow(candidate, system, caches)),
    }
    rows.push(row)
    await addRecord({
      batchId,
      rowNumber: index + 2,
      raw: row.raw,
      result: row.kind === 'ok' ? 'pending' : 'error',
      error: row.issues.join('; ') || undefined,
    })
  }

  const report = summarize(rows)
  await finishBatch(batchId, 'completed', { ...report, mode: 'dry_run' })
  return { batchId, rows, report }
}

async function commit(
  rows: RowAnalysis[],
  system: string,
): Promise<{ batchId: string; inserted: number; skipped: number }> {
  const batchId = await startBatch(system, 'commit')
  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    if (row.kind !== 'ok') {
      skipped += 1
      await addRecord({
        batchId,
        rowNumber: row.index + 2,
        raw: row.raw,
        result: 'skipped',
        error: row.issues.join('; ') || undefined,
      })
      continue
    }
    const ticketId = await upsertTicket(
      system,
      row.candidate.externalId as string,
      buildPayload(row),
    )
    if (row.resolved.technician) {
      await assignTicket(
        ticketId,
        row.resolved.technician,
        row.candidate.assignedAt,
      )
    }
    await importTimeline(ticketId, {
      reportedAt: row.candidate.reportedAt,
      assignedAt: row.candidate.assignedAt,
      finishedAt: row.candidate.finishedAt,
      closedAt: row.candidate.finishedAt,
    })
    inserted += 1
    await addRecord({
      batchId,
      rowNumber: row.index + 2,
      raw: row.raw,
      result: 'inserted',
      ticketId,
    })
  }

  await finishBatch(batchId, 'completed', {
    total: rows.length,
    inserted,
    skipped,
  })
  return { batchId, inserted, skipped }
}

/** Lógica del adaptador: analizar (dry run) y confirmar la importación. */
export function useImportRun() {
  return { analyze, commit }
}
