import { BanIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { RejectCancelRow } from '../domain/indicators'
import { rejectReasons } from '../domain/visuals'
import type { RejectReasonRow } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { StackedBarCell } from './bar-cell'

const t = metricsMessages.rejectCancel

const columns: DataTableColumn<RejectReasonRow>[] = [
  { id: 'reason', header: t.reason, cell: (row) => row.name },
  {
    id: 'split',
    header: `${t.rejected} / ${t.cancelled}`,
    hint: metricsMessages.chartHints.rejectCancel,
    cell: (row) => (
      <StackedBarCell
        segments={[
          { key: 'rejected', value: row.rejected, color: 'var(--chart-4)' },
          { key: 'cancelled', value: row.cancelled, color: 'var(--chart-5)' },
        ]}
        label={`${row.rejected} / ${row.cancelled}`}
        className="min-w-36"
      />
    ),
  },
]

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-sm bg-[var(--chart-4)]" aria-hidden />
        {t.rejected}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-sm bg-[var(--chart-5)]" aria-hidden />
        {t.cancelled}
      </span>
    </div>
  )
}

/** Rechazos y cancelaciones por motivo, en una tabla con barra apilada. */
export function RejectCancelTable({ rows }: { rows: RejectCancelRow[] }) {
  const data = rejectReasons(rows)
  if (data.length === 0) {
    return <EmptyState icon={BanIcon} title={metricsMessages.empty} />
  }
  return (
    <div className="flex flex-col gap-2">
      <Legend />
      <DataTable columns={columns} rows={data} getRowId={(row) => row.name} />
    </div>
  )
}
