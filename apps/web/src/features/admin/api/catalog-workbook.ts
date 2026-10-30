// Lectura y escritura del XLSX de catálogos (exceljs, en diferido).

import type { Workbook, Worksheet } from 'exceljs'
import { downloadBlob } from '@/lib/download'
import { CATALOG_IMPORT_SPECS } from '../domain/catalog-import'
import type { CatalogSheetRows } from '../domain/catalog-import'
import type { ExportRow } from '../domain/catalog-export'

export type CatalogSheets = Partial<Record<string, ExportRow[]>>

export interface DependencyRow {
  name: string
  active: string
  building: string
  location: string
}

export interface CatalogWorkbook {
  sheets: CatalogSheetRows
  dependencies: DependencyRow[]
}

export const DEPENDENCY_SHEET = 'Dependencias'
const DEPENDENCY_HEADERS = ['Nombre', 'Activo', 'Edificio', 'Ubicación']

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

function dependencyRows(rows: Record<string, unknown>[]): DependencyRow[] {
  return rows.map((row) => ({
    name: String(row.Nombre ?? ''),
    active: String(row.Activo ?? ''),
    building: String(row.Edificio ?? ''),
    location: String(row.Ubicación ?? ''),
  }))
}

/** Lee un XLSX y devuelve las hojas de catálogo y las dependencias con sus ubicaciones. */
export async function readCatalogWorkbook(
  file: File,
): Promise<CatalogWorkbook> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const sheets: CatalogSheetRows = {}
  const dependencies: DependencyRow[] = []
  const dependencyName = DEPENDENCY_SHEET.toLocaleLowerCase('es-MX')

  workbook.eachSheet((sheet) => {
    const name = sheet.name.trim().toLocaleLowerCase('es-MX')
    if (name === dependencyName) {
      dependencies.push(...dependencyRows(readRows(sheet)))
      return
    }
    const spec = CATALOG_IMPORT_SPECS.find(
      (item) =>
        item.key !== 'dependencies' &&
        (item.title.toLocaleLowerCase('es-MX') === name || item.key === name),
    )
    if (spec) sheets[spec.key] = readRows(sheet)
  })

  return { sheets, dependencies }
}

function writeDependencySheet(workbook: Workbook, rows: DependencyRow[]): void {
  const sheet = workbook.addWorksheet(DEPENDENCY_SHEET)
  sheet.columns = DEPENDENCY_HEADERS.map((header) => ({
    header,
    key: header,
    width: 24,
  }))
  sheet.getRow(1).font = { bold: true }
  for (const row of rows) {
    sheet.addRow({
      Nombre: row.name,
      Activo: row.active,
      Edificio: row.building,
      Ubicación: row.location,
    })
  }
}

/** Descarga el libro con una hoja por catálogo y los encabezados de importación. */
export async function writeCatalogWorkbook(
  sheets: CatalogSheets,
  dependencies: DependencyRow[] = [],
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()

  for (const spec of CATALOG_IMPORT_SPECS) {
    if (spec.key === 'dependencies') {
      writeDependencySheet(workbook, dependencies)
      continue
    }
    const sheet = workbook.addWorksheet(spec.title)
    sheet.columns = spec.columns.map((column) => ({
      header: column.header,
      key: column.header,
      width: 18,
    }))
    sheet.getRow(1).font = { bold: true }
    for (const row of sheets[spec.key] ?? []) sheet.addRow(row)
  }

  downloadBlob(
    'catalogos.xlsx',
    new Blob([await workbook.xlsx.writeBuffer()], { type: XLSX_MIME }),
  )
}
