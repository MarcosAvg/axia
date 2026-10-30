// Lectura y escritura del XLSX de catálogos (exceljs, en diferido).

import type { Workbook, Worksheet } from 'exceljs'
import { downloadBlob } from '@/lib/download'
import { CATALOG_IMPORT_SPECS } from '../domain/catalog-import'
import type { CatalogSheetRows } from '../domain/catalog-import'
import type { ExportRow } from '../domain/catalog-export'

export type CatalogSheets = Partial<Record<string, ExportRow[]>>

export interface DependencyLocationRow {
  dependency: string
  building: string
  location: string
}

export interface CatalogWorkbook {
  sheets: CatalogSheetRows
  dependencyLocations: DependencyLocationRow[]
}

export const DEPENDENCY_LOCATION_SHEET = 'Dependencia–Ubicación'
const DEPENDENCY_LOCATION_HEADERS = ['Dependencia', 'Edificio', 'Ubicación']

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    const record = value as { text?: unknown; result?: unknown }
    if (record.text !== undefined) return String(record.text)
    if (record.result !== undefined) return String(record.result)
    return ''
  }
  return String(value)
}

function readRows(sheet: Worksheet): Record<string, unknown>[] {
  const headers: string[] = []
  sheet.getRow(1).eachCell((cell, column) => {
    headers[column] = cellText(cell.value).trim()
  })
  const rows: Record<string, unknown>[] = []
  sheet.eachRow((row, index) => {
    if (index === 1) return
    const item: Record<string, unknown> = {}
    let hasValue = false
    row.eachCell((cell, column) => {
      const header = headers[column]
      if (!header) return
      const value = cellText(cell.value).trim()
      if (value !== '') hasValue = true
      item[header] = value
    })
    if (hasValue) rows.push(item)
  })
  return rows
}

function relationRows(
  rows: Record<string, unknown>[],
): DependencyLocationRow[] {
  return rows.map((row) => ({
    dependency: String(row.Dependencia ?? ''),
    building: String(row.Edificio ?? ''),
    location: String(row.Ubicación ?? ''),
  }))
}

/** Lee un XLSX y devuelve las hojas reconocidas y los vínculos dependencia–ubicación. */
export async function readCatalogWorkbook(
  file: File,
): Promise<CatalogWorkbook> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const sheets: CatalogSheetRows = {}
  const dependencyLocations: DependencyLocationRow[] = []
  const relationName = DEPENDENCY_LOCATION_SHEET.toLocaleLowerCase('es-MX')

  workbook.eachSheet((sheet) => {
    const name = sheet.name.trim().toLocaleLowerCase('es-MX')
    if (name === relationName) {
      dependencyLocations.push(...relationRows(readRows(sheet)))
      return
    }
    const spec = CATALOG_IMPORT_SPECS.find(
      (item) =>
        item.title.toLocaleLowerCase('es-MX') === name || item.key === name,
    )
    if (spec) sheets[spec.key] = readRows(sheet)
  })

  return { sheets, dependencyLocations }
}

function writeDependencyLocations(
  workbook: Workbook,
  rows: DependencyLocationRow[],
): void {
  const sheet = workbook.addWorksheet(DEPENDENCY_LOCATION_SHEET)
  sheet.columns = DEPENDENCY_LOCATION_HEADERS.map((header) => ({
    header,
    key: header,
    width: 24,
  }))
  sheet.getRow(1).font = { bold: true }
  for (const row of rows) {
    sheet.addRow({
      Dependencia: row.dependency,
      Edificio: row.building,
      Ubicación: row.location,
    })
  }
}

/** Descarga el libro con una hoja por catálogo y los encabezados de importación. */
export async function writeCatalogWorkbook(
  sheets: CatalogSheets,
  dependencyLocations: DependencyLocationRow[] = [],
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()

  for (const spec of CATALOG_IMPORT_SPECS) {
    const sheet = workbook.addWorksheet(spec.title)
    sheet.columns = spec.columns.map((column) => ({
      header: column.header,
      key: column.header,
      width: 18,
    }))
    sheet.getRow(1).font = { bold: true }
    for (const row of sheets[spec.key] ?? []) sheet.addRow(row)
    if (spec.key === 'dependencies') {
      writeDependencyLocations(workbook, dependencyLocations)
    }
  }

  downloadBlob(
    'catalogos.xlsx',
    new Blob([await workbook.xlsx.writeBuffer()], { type: XLSX_MIME }),
  )
}
