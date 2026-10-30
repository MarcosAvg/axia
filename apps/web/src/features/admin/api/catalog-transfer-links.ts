// Importación de la hoja de vínculos dependencia–ubicación.

import type { AdminRow } from './admin-api'
import { adminReplaceDependencyLocations } from './admin-api'
import type { ImportIssue, ImportReport } from './catalog-transfer-types'
import type { DependencyLocationRow } from './catalog-workbook'
import type { CatalogKey } from '../domain/catalog-import'

interface LinkGroup {
  dependency: AdminRow
  rows: DependencyLocationRow[]
  numbers: number[]
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function linksByDependency(
  rows: DependencyLocationRow[],
  cache: Record<CatalogKey, AdminRow[]>,
): { groups: LinkGroup[]; issues: ImportIssue[] } {
  const byName = new Map(
    cache.dependencies.map((row) => [
      String(row.name).toLocaleLowerCase('es-MX'),
      row,
    ]),
  )
  const groups = new Map<string, LinkGroup>()
  const issues: ImportIssue[] = []
  rows.forEach((row, index) => {
    const dependency = byName.get(
      row.dependency.trim().toLocaleLowerCase('es-MX'),
    )
    if (!dependency) {
      issues.push({
        catalog: 'dependency_locations',
        row: index + 2,
        messages: [`Sin coincidencia: Dependencia «${row.dependency}»`],
      })
      return
    }
    const key = String(dependency.id)
    const group = groups.get(key) ?? {
      dependency,
      rows: [],
      numbers: [],
    }
    group.rows.push(row)
    group.numbers.push(index + 2)
    groups.set(key, group)
  })
  return { groups: [...groups.values()], issues }
}

function locationIdsFor(
  group: LinkGroup,
  cache: Record<CatalogKey, AdminRow[]>,
): { ids: string[]; issues: ImportIssue[] } {
  const buildings = new Map(
    cache.buildings.map((row) => [
      String(row.name).toLocaleLowerCase('es-MX'),
      row,
    ]),
  )
  const ids: string[] = []
  const issues: ImportIssue[] = []
  group.rows.forEach((row, index) => {
    if (row.location.trim() === '') return
    const building = row.building.trim()
      ? buildings.get(row.building.trim().toLocaleLowerCase('es-MX'))
      : undefined
    if (row.building.trim() && !building) {
      issues.push({
        catalog: 'dependency_locations',
        row: group.numbers[index] ?? 2,
        messages: [`Sin coincidencia: Edificio «${row.building}»`],
      })
      return
    }
    const matches = cache.locations.filter(
      (location) =>
        String(location.name).toLocaleLowerCase('es-MX') ===
          row.location.trim().toLocaleLowerCase('es-MX') &&
        (!building || String(location.building_id) === String(building.id)),
    )
    if (matches.length !== 1) {
      issues.push({
        catalog: 'dependency_locations',
        row: group.numbers[index] ?? 2,
        messages: [
          matches.length === 0
            ? `Sin coincidencia: Ubicación «${row.location}»`
            : `Referencia ambigua: Ubicación «${row.location}»`,
        ],
      })
      return
    }
    ids.push(String(matches[0]?.id))
  })
  return { ids, issues }
}

export async function applyDependencyLocations(
  rows: DependencyLocationRow[],
  cache: Record<CatalogKey, AdminRow[]>,
): Promise<{ report: ImportReport; issues: ImportIssue[] }> {
  const grouped = linksByDependency(rows, cache)
  const issues = [...grouped.issues]
  const report: ImportReport = {
    catalog: 'dependency_locations',
    title: 'Dependencia–Ubicación',
    total: rows.length,
    inserted: 0,
    updated: 0,
    invalid: grouped.issues.length,
    errors: 0,
  }

  for (const group of grouped.groups) {
    const resolved = locationIdsFor(group, cache)
    if (resolved.issues.length > 0) {
      report.invalid += group.rows.length
      issues.push(...resolved.issues)
      continue
    }
    try {
      await adminReplaceDependencyLocations(
        String(group.dependency.id),
        resolved.ids,
      )
      report.updated += 1
    } catch (error) {
      report.errors += 1
      issues.push({
        catalog: 'dependency_locations',
        row: group.numbers[0] ?? 2,
        messages: [errorMessage(error)],
      })
    }
  }

  return { report, issues }
}
