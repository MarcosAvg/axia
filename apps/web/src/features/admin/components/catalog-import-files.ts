// Generación de la plantilla XLSX y lectura del archivo subido (exceljs, en diferido).

import type { Workbook, Worksheet } from 'exceljs'
import { CATALOG_IMPORT_SPECS, specByKey } from '../domain/catalog-import'
import type {
  CatalogKey,
  ImportSpec,
  References,
} from '../domain/catalog-import'
import { catalogImportMessages } from '../domain/catalog-import-messages'

export type WorkbookSheets = Partial<
  Record<CatalogKey, Record<string, unknown>[]>
>

const t = catalogImportMessages
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
export async function readCatalogWorkbook(file: File): Promise<WorkbookSheets> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const result: WorkbookSheets = {}

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

function columnLetter(index: number): string {
  let value = index
  let letters = ''
  while (value >= 0) {
    letters = String.fromCharCode(65 + (value % 26)) + letters
    value = Math.floor(value / 26) - 1
  }
  return letters
}

interface ListDef {
  header: string
  values: string[]
}

interface ListPlan {
  lists: ListDef[]
  byColumn: Map<string, number>
}

/** Reune las listas de referencia y opciones fijas y las ubica por columna. */
function collectLists(references: References): ListPlan {
  const lists: ListDef[] = []
  const index = new Map<string, number>()
  const byColumn = new Map<string, number>()

  function ensure(key: string, header: string, values: string[]): number {
    const existing = index.get(key)
    if (existing !== undefined) return existing
    const position = lists.length
    lists.push({ header, values })
    index.set(key, position)
    return position
  }

  for (const spec of CATALOG_IMPORT_SPECS) {
    for (const column of spec.columns) {
      if (column.kind === 'reference') {
        const key = `ref:${column.reference}`
        const referenceRows = references[column.reference as CatalogKey]
        byColumn.set(
          `${spec.key}.${column.key}`,
          ensure(
            key,
            specByKey(column.reference as CatalogKey).title,
            referenceRows.map((row) => row.label),
          ),
        )
      } else if (column.kind === 'fixed') {
        const key = `fixed:${column.key}`
        byColumn.set(
          `${spec.key}.${column.key}`,
          ensure(
            key,
            column.header,
            (column.options ?? []).map((option) => option.label),
          ),
        )
      }
    }
  }

  return { lists, byColumn }
}

function writeInstructions(workbook: Workbook): void {
  const sheet = workbook.addWorksheet(t.sheetInstructions)
  sheet.addRow([t.title])
  sheet.addRow([t.sheetHelp])
  sheet.addRow([t.sheetOrder])
  sheet.getRow(1).font = { bold: true, size: 14 }
  sheet.getColumn(1).width = 100
  sheet.getRow(2).alignment = { wrapText: true }
}

function writeListsSheet(workbook: Workbook, lists: ListDef[]): void {
  const sheet = workbook.addWorksheet(t.sheetLists)
  lists.forEach((list, index) => {
    const letter = columnLetter(index)
    sheet.getCell(`${letter}1`).value = list.header
    sheet.getCell(`${letter}1`).font = { bold: true }
    list.values.forEach((value, rowIndex) => {
      sheet.getCell(`${letter}${rowIndex + 2}`).value = value
    })
    sheet.getColumn(index + 1).width = 24
  })
}

function addListValidation(
  sheet: Worksheet,
  range: string,
  formula: string,
): void {
  const validations = (
    sheet as unknown as {
      dataValidations?: {
        add: (range: string, validation: unknown) => void
      }
    }
  ).dataValidations
  validations?.add(range, {
    type: 'list',
    allowBlank: true,
    formulae: [formula],
  })
}

function writeCatalogSheet(
  workbook: Workbook,
  spec: ImportSpec,
  plan: ListPlan,
): void {
  const sheet = workbook.addWorksheet(spec.title)
  sheet.addRow(spec.headings)
  sheet.getRow(1).font = { bold: true }
  spec.columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = Math.max(16, column.header.length + 4)
    const position = plan.byColumn.get(`${spec.key}.${column.key}`)
    if (position === undefined) return
    const list = plan.lists[position]
    if (!list || list.values.length === 0) return
    const letter = columnLetter(position)
    addListValidation(
      sheet,
      `${columnLetter(index)}2:${columnLetter(index)}1000`,
      `${t.sheetLists}!$${letter}$2:$${letter}$${list.values.length + 1}`,
    )
  })
}

function triggerDownload(buffer: ArrayBuffer): void {
  const blob = new Blob([buffer], { type: XLSX_MIME })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = t.fileName
  link.click()
  URL.revokeObjectURL(url)
}

/** Descarga la plantilla XLSX con una hoja por catálogo y listas de referencia. */
export async function downloadCatalogTemplate(
  references: References,
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  const plan = collectLists(references)
  writeInstructions(workbook)
  writeListsSheet(workbook, plan.lists)
  for (const spec of CATALOG_IMPORT_SPECS) {
    writeCatalogSheet(workbook, spec, plan)
  }
  const buffer = await workbook.xlsx.writeBuffer()
  triggerDownload(buffer as unknown as ArrayBuffer)
}
