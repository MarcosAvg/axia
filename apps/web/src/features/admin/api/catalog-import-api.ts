// Datos de la importación de catálogos: lectura de catálogos para referencias y RPCs de carga.

import type { Json } from '@axia/shared'
import { supabase } from '@/lib/supabase'
import { CATALOG_IMPORT_SPECS } from '../domain/catalog-import'
import type { CatalogKey, References } from '../domain/catalog-import'
import { adminList } from './admin-api'
import type { AdminRow, AdminTable } from './admin-api'

const LABEL_COLUMN: Partial<Record<CatalogKey, string>> = {
  requesters: 'full_name',
  technicians: 'full_name',
}

/** Carga todas las filas de los catálogos (para resolver referencias y clasificar). */
export async function loadCatalogRows(): Promise<
  Record<CatalogKey, AdminRow[]>
> {
  const entries = await Promise.all(
    CATALOG_IMPORT_SPECS.map(async (spec) => {
      const rows = await adminList(
        spec.key as AdminTable,
        LABEL_COLUMN[spec.key] ?? 'name',
      )
      return [spec.key, rows] as const
    }),
  )
  return Object.fromEntries(entries) as Record<CatalogKey, AdminRow[]>
}

/** Convierte las filas en referencias (id + etiqueta) por catálogo. */
export function toReferences(rows: Record<CatalogKey, AdminRow[]>): References {
  const references = {} as References
  for (const spec of CATALOG_IMPORT_SPECS) {
    references[spec.key] = (rows[spec.key] ?? []).map((row) => ({
      id: String(row.id ?? ''),
      label: String(row.name ?? row.full_name ?? ''),
      use: spec.key === 'reasons' ? String(row.use ?? '') : undefined,
    }))
  }
  return references
}

export interface SheetResult {
  catalog: string
  inserted: number
  updated: number
  errors: number
}

export async function startCatalogImport(
  mode: 'dry_run' | 'commit',
  sourceFile: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('catalog_import_start', {
    p_mode: mode,
    p_source_file: sourceFile,
  })
  if (error) throw error
  return data as string
}

export async function importCatalogSheet(
  runId: string,
  catalog: CatalogKey,
  rows: Record<string, unknown>[],
): Promise<SheetResult> {
  const { data, error } = await supabase.rpc('catalog_import_sheet', {
    p_run_id: runId,
    p_catalog: catalog,
    p_rows: rows as unknown as Json,
  })
  if (error) throw error
  return data as unknown as SheetResult
}

export async function finishCatalogImport(
  runId: string,
  status: 'completed' | 'failed',
  summary: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.rpc('catalog_import_finish', {
    p_run_id: runId,
    p_status: status,
    p_summary: summary as unknown as Json,
  })
  if (error) throw error
}

export interface CatalogImportRun {
  id: string
  sourceFile: string | null
  mode: string
  status: string
  startedAt: string
  finishedAt: string | null
  summary: Record<string, number>
}

export async function fetchCatalogImportRuns(): Promise<CatalogImportRun[]> {
  const { data, error } = await supabase
    .from('catalog_import_runs')
    .select('id, source_file, mode, status, started_at, finished_at, summary')
    .order('started_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    sourceFile: row.source_file,
    mode: row.mode,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    summary: (row.summary ?? {}) as Record<string, number>,
  }))
}
