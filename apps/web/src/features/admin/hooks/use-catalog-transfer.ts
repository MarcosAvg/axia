import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminDependencyLocationLinks } from '../api/admin-api'
import type { AdminRow, DependencyLocationLink } from '../api/admin-api'
import {
  importCatalogSheets,
  loadCatalogRows,
} from '../api/catalog-transfer-api'
import type { ImportIssue, ImportReport } from '../api/catalog-transfer-api'
import {
  readCatalogWorkbook,
  writeCatalogWorkbook,
} from '../api/catalog-workbook'
import type {
  CatalogSheets,
  CatalogWorkbook,
  DependencyRow,
} from '../api/catalog-workbook'
import { CATALOG_IMPORT_SPECS } from '../domain/catalog-import'
import type { CatalogKey } from '../domain/catalog-import'
import { toExportRows, toReferences } from '../domain/catalog-export'
import { adminMessages } from '../i18n'

const t = adminMessages.transfer

async function runTask(
  task: () => Promise<void>,
  setBusy: (value: boolean) => void,
  onError: () => void,
) {
  setBusy(true)
  try {
    await task()
  } catch {
    onError()
  } finally {
    setBusy(false)
  }
}

function dependencyRows(
  rows: Record<CatalogKey, AdminRow[]>,
  links: DependencyLocationLink[],
): DependencyRow[] {
  const byDependency = new Map<
    string,
    { building: string; location: string }[]
  >()
  for (const link of links) {
    const list = byDependency.get(link.dependencyId) ?? []
    list.push({ building: link.buildingName, location: link.locationName })
    byDependency.set(link.dependencyId, list)
  }
  return rows.dependencies.flatMap((row) => {
    const name = String(row.name ?? '')
    const active = row.active === true ? 'Sí' : 'No'
    return (byDependency.get(String(row.id)) ?? []).map((link) => ({
      name,
      active,
      ...link,
    }))
  })
}

async function exportWorkbook() {
  const [rows, links] = await Promise.all([
    loadCatalogRows(),
    adminDependencyLocationLinks(),
  ])
  const references = toReferences(rows)
  const data: CatalogSheets = {}
  for (const spec of CATALOG_IMPORT_SPECS) {
    if (spec.key !== 'dependencies') {
      data[spec.key] = toExportRows(spec, rows[spec.key], references)
    }
  }
  await writeCatalogWorkbook(data, dependencyRows(rows, links))
}

/** Lee el archivo; `null` si no trae hojas de catálogo ni dependencias. */
async function loadSheets(file: File): Promise<CatalogWorkbook | null> {
  const workbook = await readCatalogWorkbook(file)
  const hasRows =
    workbook.dependencies.length > 0 ||
    Object.values(workbook.sheets).some((rows) => rows?.length)
  return hasRows ? workbook : null
}

/** Estado de la exportación e importación del libro de catálogos. */
export function useCatalogTransfer() {
  const queryClient = useQueryClient()
  const [workbook, setWorkbook] = useState<CatalogWorkbook | null>(null)
  const [fileName, setFileName] = useState('')
  const [report, setReport] = useState<ImportReport[] | null>(null)
  const [issues, setIssues] = useState<ImportIssue[]>([])
  const [busy, setBusy] = useState(false)

  const run = (task: () => Promise<void>) =>
    runTask(task, setBusy, () => toast.error(t.error))

  const exportAll = () => run(exportWorkbook)
  function choose(file: File | null) {
    setReport(null)
    setWorkbook(null)
    if (!file) return Promise.resolve()
    return run(async () => {
      const parsed = await loadSheets(file)
      if (!parsed) {
        toast.error(t.noSheets)
        return
      }
      setWorkbook(parsed)
      setFileName(file.name)
    })
  }
  function apply() {
    if (!workbook) return Promise.resolve()
    return run(async () => {
      const result = await importCatalogSheets(
        workbook.sheets,
        workbook.dependencies,
      )
      setReport(result.report)
      setIssues(result.issues)
      setWorkbook(null)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    })
  }

  return {
    workbook,
    fileName,
    report,
    issues,
    busy,
    exportAll,
    choose,
    apply,
    cancel: () => setWorkbook(null),
    close: () => setReport(null),
    dismiss: () => {
      setWorkbook(null)
      setReport(null)
    },
  }
}
