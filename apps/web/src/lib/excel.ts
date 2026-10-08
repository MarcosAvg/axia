// Exportación a XLSX con exceljs. Se importa en diferido desde la interfaz para no
// cargarlo en el arranque (`await import('@/lib/excel')`).

import ExcelJS from 'exceljs'
import { downloadBlob } from './download'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
}

/** Genera un libro con una hoja y lo descarga. */
export async function exportXlsx(
  fileName: string,
  sheetName: string,
  columns: ExcelColumn[],
  rows: Record<string, string | number>[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName)
  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width ?? 18,
  }))
  sheet.getRow(1).font = { bold: true }
  for (const row of rows) sheet.addRow(row)
  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(
    fileName,
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  )
}
