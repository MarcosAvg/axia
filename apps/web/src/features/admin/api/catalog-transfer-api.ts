// Importación de catálogos: carga de referencias y aplicación hoja por hoja.

import {
  analyzeCatalog,
  CATALOG_IMPORT_SPECS,
  matchKeyOf,
} from '../domain/catalog-import'
import type {
  CatalogKey,
  CatalogSheetRows,
  ImportSpec,
} from '../domain/catalog-import'
import { toReferences } from '../domain/catalog-export'
import { adminInsert, adminList, adminUpdate } from './admin-api'
import type { AdminRow, AdminTable } from './admin-api'
import { applyDependencies } from './catalog-transfer-dependencies'
import type { DependencyRow } from './catalog-workbook'

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

export type { ImportIssue, ImportReport } from './catalog-transfer-types'

import type { ImportIssue, ImportReport } from './catalog-transfer-types'

interface PendingRow {
  raw: Record<string, unknown>
  number: number
  messages: string[]
}

interface SheetState {
  spec: ImportSpec
  total: number
  inserted: number
  updated: number
  invalid: number
  errors: number
  pending: PendingRow[]
  issues: ImportIssue[]
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function applySheet(
  state: SheetState,
  cache: Record<CatalogKey, AdminRow[]>,
): Promise<number> {
  const { spec } = state
  const rows = cache[spec.key]
  const existing = new Map(rows.map((row) => [matchKeyOf(spec, row), row]))
  const analysis = analyzeCatalog(
    spec,
    state.pending.map((item) => item.raw),
    toReferences(cache),
    new Set(existing.keys()),
  )
  let applied = 0
  const retry: PendingRow[] = []

  for (const [index, row] of analysis.rows.entries()) {
    const item = state.pending[index]
    if (!item) continue
    if (row.issues.length > 0) {
      // Una referencia puede resolverse después de insertar otra hoja o fila.
      if (row.issues.every((issue) => issue.startsWith('Sin coincidencia'))) {
        retry.push({ ...item, messages: row.issues })
      } else {
        state.invalid += 1
        state.issues.push({
          catalog: spec.key,
          row: item.number,
          messages: row.issues,
        })
      }
      continue
    }

    try {
      const found = existing.get(row.matchKey)
      if (found) {
        await adminUpdate(spec.key as AdminTable, String(found.id), row.data)
        Object.assign(found, row.data)
        state.updated += 1
      } else {
        const id = await adminInsert(spec.key as AdminTable, row.data)
        const added = { id, ...row.data }
        rows.push(added)
        existing.set(row.matchKey, added)
        state.inserted += 1
      }
      applied += 1
    } catch (error) {
      state.errors += 1
      state.issues.push({
        catalog: spec.key,
        row: item.number,
        messages: [errorMessage(error)],
      })
    }
  }

  state.pending = retry
  return applied
}

function createStates(sheets: CatalogSheetRows): SheetState[] {
  const states: SheetState[] = []
  for (const spec of CATALOG_IMPORT_SPECS) {
    if (spec.key === 'dependencies') continue
    const rows = sheets[spec.key]
    if (!rows || rows.length === 0) continue
    states.push({
      spec,
      total: rows.length,
      inserted: 0,
      updated: 0,
      invalid: 0,
      errors: 0,
      pending: rows.map((raw, index) => ({
        raw,
        number: index + 2,
        messages: [],
      })),
      issues: [],
    })
  }
  return states
}

function flushPending(states: SheetState[]): ImportIssue[] {
  return states.flatMap((state) => {
    for (const item of state.pending) {
      state.invalid += 1
      state.issues.push({
        catalog: state.spec.key,
        row: item.number,
        messages: item.messages,
      })
    }
    return state.issues
  })
}

function reportOf(states: SheetState[]): ImportReport[] {
  return states.map((state) => ({
    catalog: state.spec.key,
    title: state.spec.title,
    total: state.total,
    inserted: state.inserted,
    updated: state.updated,
    invalid: state.invalid,
    errors: state.errors,
  }))
}

/**
 * Aplica las hojas en orden de dependencias. Una fila con referencias sin
 * resolver se reintenta tras insertar las demás (instancia vacía o motivos
 * con padre en el mismo archivo).
 */
export async function importCatalogSheets(
  sheets: CatalogSheetRows,
  dependencies: DependencyRow[] = [],
): Promise<{ report: ImportReport[]; issues: ImportIssue[] }> {
  const cache = await loadCatalogRows()
  const dependencyResult =
    dependencies.length > 0
      ? await applyDependencies(dependencies, cache)
      : null
  const states = createStates(sheets)

  let progressed = true
  while (progressed) {
    progressed = false
    for (const state of states) {
      if (state.pending.length === 0) continue
      if ((await applySheet(state, cache)) > 0) progressed = true
    }
  }

  const issues = flushPending(states)

  return {
    report: [
      ...(dependencyResult ? [dependencyResult.report] : []),
      ...reportOf(states),
    ],
    issues: [...(dependencyResult?.issues ?? []), ...issues],
  }
}
