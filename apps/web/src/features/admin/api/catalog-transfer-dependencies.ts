// Importación de dependencias con sus ubicaciones (una fila por ubicación).

import type { AdminRow } from './admin-api'
import { adminSaveDependency } from './admin-api'
import type { ImportIssue, ImportReport } from './catalog-transfer-types'
import type { DependencyRow } from './catalog-workbook'
import { parseBoolean } from '../domain/catalog-import'
import type { CatalogKey } from '../domain/catalog-import'

interface DependencyGroup {
  key: string
  name: string
  rows: DependencyRow[]
  numbers: number[]
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function groupsOf(rows: DependencyRow[]): {
  groups: DependencyGroup[]
  issues: ImportIssue[]
} {
  const groups = new Map<string, DependencyGroup>()
  const issues: ImportIssue[] = []
  rows.forEach((row, index) => {
    const key = row.name.trim().toLocaleLowerCase('es-MX')
    if (!key) {
      issues.push({
        catalog: 'dependencies',
        row: index + 2,
        messages: ['Falta Nombre'],
      })
      return
    }
    const group = groups.get(key) ?? {
      key,
      name: row.name.trim(),
      rows: [],
      numbers: [],
    }
    group.rows.push(row)
    group.numbers.push(index + 2)
    groups.set(key, group)
  })
  return { groups: [...groups.values()], issues }
}

function resolveLocations(
  group: DependencyGroup,
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
    const rowNumber = group.numbers[index] ?? 2
    const buildingName = row.building.trim()
    const locationName = row.location.trim()
    if (!buildingName || !locationName) {
      issues.push({
        catalog: 'dependencies',
        row: rowNumber,
        messages: [!buildingName ? 'Falta Edificio' : 'Falta Ubicación'],
      })
      return
    }
    const building = buildings.get(buildingName.toLocaleLowerCase('es-MX'))
    if (!building) {
      issues.push({
        catalog: 'dependencies',
        row: rowNumber,
        messages: [`Sin coincidencia: Edificio «${row.building}»`],
      })
      return
    }
    const matches = cache.locations.filter(
      (location) =>
        String(location.building_id) === String(building.id) &&
        String(location.name).toLocaleLowerCase('es-MX') ===
          locationName.toLocaleLowerCase('es-MX'),
    )
    if (matches.length !== 1) {
      issues.push({
        catalog: 'dependencies',
        row: rowNumber,
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
  return { ids: [...new Set(ids)], issues }
}

function activeOf(group: DependencyGroup): boolean | null {
  const raw = group.rows[0]?.active ?? ''
  if (raw.trim() === '') return true
  const parsed = parseBoolean(raw)
  return parsed
}

export async function applyDependencies(
  rows: DependencyRow[],
  cache: Record<CatalogKey, AdminRow[]>,
): Promise<{ report: ImportReport; issues: ImportIssue[] }> {
  const grouped = groupsOf(rows)
  const issues = [...grouped.issues]
  const report: ImportReport = {
    catalog: 'dependencies',
    title: 'Dependencias',
    total: rows.length,
    inserted: 0,
    updated: 0,
    invalid: grouped.issues.length,
    errors: 0,
  }

  for (const group of grouped.groups) {
    const active = activeOf(group)
    const resolved = resolveLocations(group, cache)
    if (active === null) {
      report.invalid += group.rows.length
      issues.push({
        catalog: 'dependencies',
        row: group.numbers[0] ?? 2,
        messages: ['Activo no es Sí/No'],
      })
      continue
    }
    if (resolved.issues.length > 0 || resolved.ids.length === 0) {
      report.invalid += group.rows.length
      issues.push(...resolved.issues)
      continue
    }
    const existing = cache.dependencies.find(
      (row) =>
        String(row.name).toLocaleLowerCase('es-MX') ===
        group.name.toLocaleLowerCase('es-MX'),
    )
    try {
      const id = await adminSaveDependency(
        { name: group.name, active, locationIds: resolved.ids },
        existing ? String(existing.id) : undefined,
      )
      if (existing) {
        Object.assign(existing, { name: group.name, active })
        report.updated += 1
      } else {
        cache.dependencies.push({ id, name: group.name, active })
        report.inserted += 1
      }
    } catch (error) {
      report.errors += 1
      issues.push({
        catalog: 'dependencies',
        row: group.numbers[0] ?? 2,
        messages: [errorMessage(error)],
      })
    }
  }

  return { report, issues }
}
