// Lectura del archivo de origen: CSV (papaparse) o Excel (exceljs, en diferido).

import Papa from 'papaparse'

function readCsv(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    })
  })
}

async function readXlsx(file: File): Promise<Record<string, unknown>[]> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const sheet = workbook.worksheets[0]
  if (!sheet) return []
  const headers: string[] = []
  sheet.getRow(1).eachCell((cell, column) => {
    headers[column] = String(cell.value ?? '')
  })
  const rows: Record<string, unknown>[] = []
  sheet.eachRow((row, index) => {
    if (index === 1) return
    const item: Record<string, unknown> = {}
    row.eachCell((cell, column) => {
      item[headers[column] ?? `col${column}`] = cell.value
    })
    rows.push(item)
  })
  return rows
}

/** Lee las filas crudas del archivo (CSV o XLSX). */
export async function readRows(file: File): Promise<Record<string, unknown>[]> {
  if (file.name.toLowerCase().endsWith('.csv')) return readCsv(file)
  return readXlsx(file)
}
