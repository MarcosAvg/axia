import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'
import type { CatalogImportRun } from '../api/catalog-import-api'
import { catalogImportMessages } from '../domain/catalog-import-messages'
import { useCatalogImportHistory } from '../hooks/use-catalog-import'
import { adminMessages } from '../i18n'

function statusLabel(status: string): string {
  return catalogImportMessages.statuses[status] ?? status
}

function buildColumns(): DataTableColumn<CatalogImportRun>[] {
  const t = catalogImportMessages
  return [
    {
      id: 'file',
      header: t.file,
      cell: (run) => run.sourceFile ?? '—',
    },
    {
      id: 'status',
      header: t.statusColumn,
      cell: (run) => (
        <Badge variant="secondary">{statusLabel(run.status)}</Badge>
      ),
    },
    {
      id: 'started',
      header: t.startedColumn,
      cell: (run) => formatDateTime(run.startedAt),
    },
    {
      id: 'totals',
      header: t.totalsColumn,
      align: 'right',
      cell: (run) =>
        `${run.summary.inserted ?? 0} · ${run.summary.updated ?? 0}`,
    },
  ]
}

/** Historial de cargas de catálogos. */
export function CatalogImportHistory() {
  const history = useCatalogImportHistory()
  const { list } = adminMessages
  const t = catalogImportMessages

  if (history.isLoading) return <LoadingList rows={3} />
  if (history.isError) return <ErrorAlert message={list.error} />
  const rows = history.data ?? []
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.empty}</p>
  }
  return (
    <DataTable
      columns={buildColumns()}
      rows={rows}
      getRowId={(run) => run.id}
    />
  )
}
