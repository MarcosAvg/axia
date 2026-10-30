// Lectura y escritura del XLSX de catálogos (exceljs, en diferido).

import { downloadBlob } from '@/lib/download'
import { CATALOG_IMPORT_SPECS } from '../domain/catalog-import'
import type { CatalogSheetRows } from '../domain/catalog-import'
import type { ExportRow } from '../domain/catalog-export'

export type CatalogSheets = Partial<Record<string, ExportRow[]>>

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

/** Lee un XLSX y devuelve las filas (por encabezado) de las hojas reconocidas. */
export async function readCatalogWorkbook(
  file: File,
): Promise<CatalogSheetRows> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const result: CatalogSheetRows = {}

  workbook.eachSheet((sheet) => {
    const name = sheet.name.trim().toLocaleLowerCase('es-MX')
    const spec = CATALOG_IMPORT_SPECS.find(
      (item) =>
        item.title.toLocaleLowerCase('es-MX') === name || item.key === name,
    )
    if (!spec) return
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
    result[spec.key] = rows
  })

  return result
}

/** Descarga el libro con una hoja por catálogo y los encabezados de importación. */
export async function writeCatalogWorkbook(
  sheets: CatalogSheets,
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
  }

  downloadBlob(
    'catalogos.xlsx',
    new Blob([await workbook.xlsx.writeBuffer()], { type: XLSX_MIME }),
  )
}
