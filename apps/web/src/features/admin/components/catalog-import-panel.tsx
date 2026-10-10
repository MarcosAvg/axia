import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  finishCatalogImport,
  importCatalogSheet,
  startCatalogImport,
  toReferences,
} from '../api/catalog-import-api'
import type { SheetResult } from '../api/catalog-import-api'
import type { AdminRow } from '../api/admin-api'
import {
  CATALOG_IMPORT_SPECS,
  analyzeCatalog,
  matchKeyOf,
} from '../domain/catalog-import'
import type { CatalogAnalysis, CatalogKey } from '../domain/catalog-import'
import { catalogImportMessages } from '../domain/catalog-import-messages'
import { useCatalogRows } from '../hooks/use-catalog-import'
import { CatalogImportHistory } from './catalog-import-history'
import {
  downloadCatalogTemplate,
  readCatalogWorkbook,
} from './catalog-import-files'

const t = catalogImportMessages

async function analyzeFile(
  file: File,
  catalogRows: Record<CatalogKey, AdminRow[]>,
): Promise<CatalogAnalysis[]> {
  const sheets = await readCatalogWorkbook(file)
  const references = toReferences(catalogRows)
  const analyses: CatalogAnalysis[] = []
  for (const spec of CATALOG_IMPORT_SPECS) {
    const rows = sheets[spec.key]
    if (!rows || rows.length === 0) continue
    const existing = new Set(
      (catalogRows[spec.key] ?? []).map((row) => matchKeyOf(spec, row)),
    )
    analyses.push(analyzeCatalog(spec, rows, references, existing))
  }
  return analyses
}

interface CommitResult {
  inserted: number
  updated: number
  errors: number
  invalid: number
}

async function commitAnalyses(
  analyses: CatalogAnalysis[],
  fileName: string,
): Promise<CommitResult> {
  const runId = await startCatalogImport('commit', fileName)
  const catalogs: Record<string, SheetResult> = {}
  let inserted = 0
  let updated = 0
  let errors = 0
  let invalid = 0
  try {
    for (const analysis of analyses) {
      const valid = analysis.rows.filter((row) => row.issues.length === 0)
      invalid += analysis.rows.length - valid.length
      if (valid.length === 0) continue
      const result = await importCatalogSheet(
        runId,
        analysis.catalog,
        valid.map((row) => row.data),
      )
      catalogs[analysis.catalog] = result
      inserted += result.inserted
      updated += result.updated
      errors += result.errors
    }
    await finishCatalogImport(runId, 'completed', {
      inserted,
      updated,
      errors,
      invalid,
      catalogs,
    })
    return { inserted, updated, errors, invalid }
  } catch (error) {
    await finishCatalogImport(runId, 'failed', {}).catch(() => undefined)
    throw error
  }
}

function useCatalogImportPanel() {
  const catalogs = useCatalogRows()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [analyses, setAnalyses] = useState<CatalogAnalysis[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [applied, setApplied] = useState<number | null>(null)

  async function runAnalyze() {
    if (!file || !catalogs.data) {
      toast.error(t.needFile)
      return
    }
    setBusy(true)
    setApplied(null)
    try {
      const result = await analyzeFile(file, catalogs.data)
      if (result.length === 0) toast.error(t.noSheets)
      setAnalyses(result)
    } catch {
      toast.error(t.error)
    } finally {
      setBusy(false)
    }
  }

  async function runCommit() {
    if (!analyses) return
    setBusy(true)
    try {
      const result = await commitAnalyses(analyses, file?.name ?? t.fileName)
      setApplied(result.inserted + result.updated)
      setAnalyses(null)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    } catch {
      toast.error(t.error)
    } finally {
      setBusy(false)
    }
  }

  function runDownload() {
    if (!catalogs.data) return
    void downloadCatalogTemplate(toReferences(catalogs.data))
  }

  return {
    file,
    setFile,
    analyses,
    busy,
    applied,
    runAnalyze,
    runCommit,
    runDownload,
  }
}

function reportColumns(): DataTableColumn<CatalogAnalysis>[] {
  const number = (
    id: string,
    header: string,
    value: (a: CatalogAnalysis) => number,
  ): DataTableColumn<CatalogAnalysis> => ({
    id,
    header,
    align: 'right',
    cell: value,
  })
  return [
    { id: 'catalog', header: t.catalogColumn, cell: (a) => a.title },
    number('total', t.total, (a) => a.total),
    number('inserted', t.inserted, (a) => a.inserted),
    number('updated', t.updated, (a) => a.updated),
    number('invalid', t.invalid, (a) => a.invalid),
  ]
}

function AnalysisReport({
  analyses,
  busy,
  onCommit,
}: {
  analyses: CatalogAnalysis[]
  busy: boolean
  onCommit: () => void
}) {
  const applicable = analyses.reduce(
    (sum, analysis) => sum + analysis.inserted + analysis.updated,
    0,
  )
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <h3 className="text-sm font-medium">{t.reportTitle}</h3>
      <DataTable
        columns={reportColumns()}
        rows={analyses}
        getRowId={(analysis) => analysis.catalog}
      />
      <Button
        type="button"
        disabled={busy || applicable === 0}
        className="self-start"
        onClick={onCommit}
      >
        {busy ? t.importing : t.confirm}
      </Button>
    </div>
  )
}

function ImportTab({
  panel,
}: {
  panel: ReturnType<typeof useCatalogImportPanel>
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t.help}</p>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={panel.runDownload}
      >
        {t.download}
      </Button>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void panel.runAnalyze()
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="catalog-import-file">{t.file}</Label>
          <Input
            id="catalog-import-file"
            type="file"
            accept=".xlsx"
            className="min-h-11"
            onChange={(event) => panel.setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit" disabled={panel.busy}>
          {panel.busy ? t.analyzing : t.analyze}
        </Button>
      </form>
      {panel.applied !== null ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t.done(panel.applied)}
        </p>
      ) : null}
      {panel.analyses ? (
        <AnalysisReport
          analyses={panel.analyses}
          busy={panel.busy}
          onCommit={() => {
            void panel.runCommit()
          }}
        />
      ) : null}
    </div>
  )
}

/** Panel de importación de catálogos por plantilla, con historial. */
export function CatalogImportPanel() {
  const panel = useCatalogImportPanel()

  return (
    <Tabs defaultValue="import" className="flex flex-col gap-4">
      <TabsList>
        <TabsTrigger value="import" className="min-h-9">
          {t.import}
        </TabsTrigger>
        <TabsTrigger value="history" className="min-h-9">
          {t.history}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="import">
        <ImportTab panel={panel} />
      </TabsContent>
      <TabsContent value="history">
        <CatalogImportHistory />
      </TabsContent>
    </Tabs>
  )
}
