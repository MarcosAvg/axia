// Importación de la hoja de transiciones de pausa, después de los catálogos.

import type { ImportIssue, ImportReport } from './catalog-transfer-types'
import type { PauseTransitionRow } from './catalog-workbook'
import { adminPauseFlows, adminSavePauseFlow } from './pause-flow-api'
import type { PauseFlow } from './pause-flow-api'

type TransitionGroup = {
  flow: PauseFlow
  edges: { from: string; to: string }[]
  rows: number
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function buildTransitionGroups(
  rows: PauseTransitionRow[],
  flows: PauseFlow[],
): {
  groups: Map<string, TransitionGroup>
  invalid: number
  issues: ImportIssue[]
} {
  const byName = new Map(flows.map((flow) => [flow.rootName, flow]))
  const groups = new Map<string, TransitionGroup>()
  const issues: ImportIssue[] = []
  let invalid = 0

  rows.forEach((row, index) => {
    const number = index + 2
    const flow = byName.get(row.motive)
    if (!flow) {
      invalid += 1
      issues.push({
        catalog: 'pause_transitions',
        row: number,
        messages: [`Motivo de pausa no encontrado: ${row.motive}`],
      })
      return
    }
    const nodes = new Map(flow.nodes.map((node) => [node.name, node.id]))
    const from = row.from === flow.rootName ? flow.rootId : nodes.get(row.from)
    const to = nodes.get(row.to)
    if (!from || !to) {
      invalid += 1
      issues.push({
        catalog: 'pause_transitions',
        row: number,
        messages: [
          `No se encontró la transición ${row.from} → ${row.to} en ${row.motive}`,
        ],
      })
      return
    }
    const group = groups.get(flow.rootId) ?? { flow, edges: [], rows: 0 }
    if (!group.edges.some((edge) => edge.from === from && edge.to === to)) {
      group.edges.push({ from, to })
    }
    group.rows += 1
    groups.set(flow.rootId, group)
  })

  return { groups, invalid, issues }
}

async function saveTransitionGroups(
  groups: Map<string, TransitionGroup>,
): Promise<{ inserted: number; errors: number; issues: ImportIssue[] }> {
  let inserted = 0
  let errors = 0
  const issues: ImportIssue[] = []
  for (const group of groups.values()) {
    try {
      await adminSavePauseFlow(group.flow.rootId, group.edges)
      inserted += group.edges.length
    } catch (error) {
      errors += group.rows
      issues.push({
        catalog: 'pause_transitions',
        row: 2,
        messages: [`${group.flow.rootName}: ${errorMessage(error)}`],
      })
    }
  }
  return { inserted, errors, issues }
}

/** Reemplaza el flujo completo de cada motivo presente en la hoja. */
export async function applyPauseTransitions(
  rows: PauseTransitionRow[],
): Promise<{ report: ImportReport; issues: ImportIssue[] } | null> {
  if (rows.length === 0) return null
  const flows = await adminPauseFlows()
  const built = buildTransitionGroups(rows, flows)
  const saved = await saveTransitionGroups(built.groups)
  return {
    report: {
      catalog: 'pause_transitions',
      title: 'Transiciones de pausa',
      total: rows.length,
      inserted: saved.inserted,
      updated: 0,
      invalid: built.invalid,
      errors: saved.errors,
    },
    issues: [...built.issues, ...saved.issues],
  }
}
