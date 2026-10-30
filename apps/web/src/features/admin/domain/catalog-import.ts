// Importación de catálogos: parsing, preparación y análisis (funciones puras).

import { adminMessages } from '../i18n'
import type {
  CatalogKey,
  CellValue,
  ImportColumn,
  ImportSpec,
  ReferenceRow,
  References,
} from './catalog-import-specs'

export * from './catalog-import-specs'

const reasonUseOptions = Object.entries(adminMessages.reasonUse)

/** `Sí`/`No`/`true`/`false`/`1`/`0` → booleano; vacío → `null`. */
export function parseBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value
  const text = String(value).trim().toLocaleLowerCase('es-MX')
  if (text === '') return null
  if (['sí', 'si', 'true', '1', 'x'].includes(text)) return true
  if (['no', 'false', '0'].includes(text)) return false
  return null
}

/** Número desde texto o número; `null` si vacío; `undefined` si inválido. */
export function parseNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  const text = String(value).trim()
  if (text === '') return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : undefined
}

function findReference(
  rows: ReferenceRow[] | undefined,
  label: string,
): { row?: ReferenceRow; ambiguous?: true } {
  const target = label.trim().toLocaleLowerCase('es-MX')
  const matches = (rows ?? []).filter(
    (row) => row.label.toLocaleLowerCase('es-MX') === target,
  )
  if (matches.length > 1) return { ambiguous: true }
  return { row: matches[0] }
}

function findFixed(column: ImportColumn, value: string): string | null {
  const target = value.trim().toLocaleLowerCase('es-MX')
  const option = column.options?.find(
    (item) =>
      item.value.toLocaleLowerCase('es-MX') === target ||
      item.label.toLocaleLowerCase('es-MX') === target,
  )
  return option ? option.value : null
}

/** Empareja el uso de un motivo (valor o etiqueta) con su valor. */
function findFixedReasonUse(label: string): string | null {
  const target = label.trim().toLocaleLowerCase('es-MX')
  const option = reasonUseOptions.find(
    ([value, text]) =>
      value.toLocaleLowerCase('es-MX') === target ||
      text.toLocaleLowerCase('es-MX') === target,
  )
  return option ? option[0] : null
}

export interface PreparedRow {
  catalog: CatalogKey
  rowNumber: number
  data: Record<string, CellValue>
  issues: string[]
  /** Clave natural para detectar duplicados y existentes. */
  matchKey: string
}

/** Clave natural de un registro (en la base o preparado). */
export function matchKeyOf(
  spec: ImportSpec,
  record: Record<string, unknown>,
): string {
  return spec.match
    .map((column) => {
      const value = record[column]
      return value === null || value === undefined ? '' : String(value)
    })
    .join('\u0001')
}

type Parsed = { value: CellValue } | { issue: string }

interface ResolveContext {
  references: References
  raw: Record<string, unknown>
  scopeId?: CellValue
}

function parseReferenceColumn(
  column: ImportColumn,
  rawValue: unknown,
  { references, raw, scopeId }: ResolveContext,
): Parsed {
  const label = String(rawValue).trim()
  let rows = references[column.reference as CatalogKey]
  if (scopeId !== null && scopeId !== undefined) {
    rows = rows?.filter((row) => row.parentId === String(scopeId))
  }
  if (column.reference === 'reasons') {
    const resolvedUse = findFixedReasonUse(String(raw['Uso'] ?? ''))
    rows = rows?.filter((row) => !row.use || row.use === resolvedUse)
  }
  const found = findReference(rows, label)
  if (found.ambiguous) {
    return { issue: `Referencia ambigua: ${column.header} «${label}»` }
  }
  return found.row
    ? { value: found.row.id }
    : { issue: `Sin coincidencia: ${column.header} «${label}»` }
}

function columnValue(
  column: ImportColumn,
  rawValue: unknown,
  context: ResolveContext,
): Parsed {
  if (column.kind === 'text') return { value: String(rawValue).trim() }
  if (column.kind === 'number') {
    const parsed = parseNumber(rawValue)
    return parsed === undefined
      ? { issue: `${column.header} no es un número` }
      : { value: parsed }
  }
  if (column.kind === 'boolean') {
    const parsed = parseBoolean(rawValue)
    return parsed === null
      ? { issue: `${column.header} no es Sí/No` }
      : { value: parsed }
  }
  if (column.kind === 'fixed') {
    const parsed = findFixed(column, String(rawValue))
    return parsed === null
      ? { issue: `${column.header} no es válido` }
      : { value: parsed }
  }
  return parseReferenceColumn(column, rawValue, context)
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === ''
}

function rawValueOf(
  column: ImportColumn,
  raw: Record<string, unknown>,
): unknown {
  return raw[column.header]
}

/** Convierte una fila cruda (por encabezado) a datos tipados o a incidencias. */
export function prepareRow(
  spec: ImportSpec,
  raw: Record<string, unknown>,
  rowNumber: number,
  references: References,
): PreparedRow {
  const data: Record<string, CellValue> = {}
  const resolved: Record<string, CellValue> = {}
  const issues: string[] = []

  for (const column of spec.columns) {
    const rawValue = rawValueOf(column, raw)
    if (isEmpty(rawValue)) {
      if (column.required) issues.push(`Falta ${column.header}`)
      continue
    }
    const scopeId = column.scopeBy ? resolved[column.scopeBy] : undefined
    const parsed = columnValue(column, rawValue, {
      references,
      raw,
      scopeId,
    })
    if ('issue' in parsed) {
      issues.push(parsed.issue)
      continue
    }
    resolved[column.key] = parsed.value
    if (!column.context) data[column.key] = parsed.value
  }

  for (const column of spec.match) {
    if (!(column in data)) data[column] = null
  }

  return {
    catalog: spec.key,
    rowNumber,
    data,
    issues,
    matchKey: matchKeyOf(spec, data),
  }
}

export interface CatalogAnalysis {
  catalog: CatalogKey
  title: string
  total: number
  inserted: number
  updated: number
  invalid: number
  rows: PreparedRow[]
}

/** Analiza (dry run) una hoja: nuevas, a actualizar, inválidas y duplicadas. */
export function analyzeCatalog(
  spec: ImportSpec,
  rawRows: Record<string, unknown>[],
  references: References,
  existingMatchKeys: Set<string>,
): CatalogAnalysis {
  const rows = rawRows.map((raw, index) =>
    prepareRow(spec, raw, index + 2, references),
  )
  const seen = new Set<string>()
  let inserted = 0
  let updated = 0
  let invalid = 0

  for (const row of rows) {
    if (row.issues.length > 0) {
      invalid += 1
      continue
    }
    if (seen.has(row.matchKey)) {
      row.issues.push('Duplicado en el archivo')
      invalid += 1
      continue
    }
    seen.add(row.matchKey)
    if (existingMatchKeys.has(row.matchKey)) updated += 1
    else inserted += 1
  }

  return {
    catalog: spec.key,
    title: spec.title,
    total: rows.length,
    inserted,
    updated,
    invalid,
    rows,
  }
}
