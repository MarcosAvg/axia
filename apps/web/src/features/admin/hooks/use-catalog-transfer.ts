import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  importCatalogSheets,
  loadCatalogRows,
} from '../api/catalog-transfer-api'
import type { ImportIssue, ImportReport } from '../api/catalog-transfer-api'
import {
  readCatalogWorkbook,
  writeCatalogWorkbook,
} from '../api/catalog-workbook'
import type { CatalogSheets } from '../api/catalog-workbook'
import { CATALOG_IMPORT_SPECS } from '../domain/catalog-import'
import type { CatalogSheetRows } from '../domain/catalog-import'
import { toExportRows, toReferences } from '../domain/catalog-export'
import { adminMessages } from '../i18n'

const t = adminMessages.transfer

async function exportWorkbook() {
  const rows = await loadCatalogRows()
  const references = toReferences(rows)
  const data: CatalogSheets = {}
  for (const spec of CATALOG_IMPORT_SPECS) {
    data[spec.key] = toExportRows(spec, rows[spec.key], references)
  }
  await writeCatalogWorkbook(data)
}

/** Lee el archivo; `null` si no trae hojas de catálogo. */
async function loadSheets(file: File): Promise<CatalogSheetRows | null> {
  const workbook = await readCatalogWorkbook(file)
  const hasRows = Object.values(workbook).some((rows) => rows?.length)
  return hasRows ? workbook : null
}

/** Estado de la exportación e importación del libro de catálogos. */
export function useCatalogTransfer() {
  const queryClient = useQueryClient()
  const [sheets, setSheets] = useState<CatalogSheetRows | null>(null)
  const [fileName, setFileName] = useState('')
  const [report, setReport] = useState<ImportReport[] | null>(null)
  const [issues, setIssues] = useState<ImportIssue[]>([])
  const [busy, setBusy] = useState(false)

  async function run(task: () => Promise<void>) {
    setBusy(true)
    try {
      await task()
    } catch {
      toast.error(t.error)
    } finally {
      setBusy(false)
    }
  }

  const exportAll = () => run(exportWorkbook)
  function choose(file: File | null) {
    setReport(null)
    setSheets(null)
    if (!file) return Promise.resolve()
    return run(async () => {
      const workbook = await loadSheets(file)
      if (!workbook) {
        toast.error(t.noSheets)
        return
      }
      setSheets(workbook)
      setFileName(file.name)
    })
  }
  function apply() {
    if (!sheets) return Promise.resolve()
    return run(async () => {
      const result = await importCatalogSheets(sheets)
      setReport(result.report)
      setIssues(result.issues)
      setSheets(null)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    })
  }

  return {
    sheets,
    fileName,
    report,
    issues,
    busy,
    exportAll,
    choose,
    apply,
    cancel: () => setSheets(null),
    close: () => setReport(null),
    dismiss: () => {
      setSheets(null)
      setReport(null)
    },
  }
}
