// Exportación de catálogos: filas de base a filas de hoja (funciones puras).

import { CATALOG_IMPORT_SPECS } from './catalog-import-specs'
import type {
  CatalogKey,
  ImportColumn,
  ImportSpec,
  ReferenceRow,
  References,
} from './catalog-import-specs'

type ExportCell = string | number | null
export type ExportRow = Record<string, ExportCell>

function labelOf(row: Record<string, unknown>): string {
  return String(row.name ?? row.full_name ?? '')
}

/**
 * Referencias (id, nombre y ruta con el padre) por catálogo. La ruta desambigua
 * catálogos donde el nombre se repite bajo padres distintos (categorías, ubicaciones…).
 */
function parentOf(
  spec: ImportSpec,
  row: Record<string, unknown>,
  column: ImportColumn | undefined,
  references: References,
): ReferenceRow | undefined {
  if (!column || spec.key === 'reasons') return undefined
  return references[column.reference as CatalogKey]?.find(
    (item) => item.id === String(row[column.key] ?? ''),
  )
}

function referenceRow(
  spec: ImportSpec,
  row: Record<string, unknown>,
  column: ImportColumn | undefined,
  references: References,
): ReferenceRow {
  const label = labelOf(row)
  const parent = parentOf(spec, row, column, references)
  return {
    id: String(row.id ?? ''),
    label,
    path: parent ? `${parent.path ?? parent.label} / ${label}` : label,
    parentId: parent?.id,
    ancestors: parent ? [...(parent.ancestors ?? []), parent.label] : [],
    use: spec.key === 'reasons' ? String(row.use ?? '') : undefined,
  }
}

export function toReferences(
  rows: Record<CatalogKey, Record<string, unknown>[]>,
): References {
  const references = {} as References

  for (const spec of CATALOG_IMPORT_SPECS) {
    const parent = spec.columns.find(
      (column) =>
        column.kind === 'reference' && spec.match.includes(column.key),
    )
    references[spec.key] = (rows[spec.key] ?? []).map((row) =>
      referenceRow(spec, row, parent, references),
    )
  }

  return references
}

function fixedLabel(column: ImportColumn, value: unknown): string | null {
  if (value === null || value === undefined) return null
  const option = column.options?.find((item) => item.value === String(value))
  return option ? option.label : String(value)
}

function referenceLabel(
  column: ImportColumn,
  value: unknown,
  references: References,
): string | null {
  if (value === null || value === undefined || value === '') return null
  const row = references[column.reference as CatalogKey]?.find(
    (item) => item.id === String(value),
  )
  return row ? row.label : null
}

function booleanCell(value: unknown): ExportCell {
  if (value === true) return 'Sí'
  if (value === false) return 'No'
  return null
}

function numberCell(value: unknown): ExportCell {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function cellValue(
  column: ImportColumn,
  value: unknown,
  references: References,
): ExportCell {
  switch (column.kind) {
    case 'boolean':
      return booleanCell(value)
    case 'fixed':
      return fixedLabel(column, value)
    case 'reference':
      return referenceLabel(column, value, references)
    case 'number':
      return numberCell(value)
    default:
      return value === null || value === undefined ? null : String(value)
  }
}

/** Convierte las filas de un catálogo en filas de hoja, con encabezados de importación. */
export function toExportRows(
  spec: ImportSpec,
  rows: Record<string, unknown>[],
  references: References,
): ExportRow[] {
  return rows.map((row) => {
    const exported: ExportRow = {}
    const reference = references[spec.key]?.find(
      (item) => item.id === String(row.id ?? ''),
    )
    for (const column of spec.columns) {
      if (column.context) {
        exported[column.header] =
          column.contextIndex === undefined
            ? null
            : (reference?.ancestors?.[column.contextIndex] ?? null)
      } else {
        exported[column.header] = cellValue(column, row[column.key], references)
      }
    }
    return exported
  })
}
