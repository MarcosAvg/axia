import { BanIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { RejectCancelRow } from '../domain/indicators'
import { metricsMessages } from '../i18n'

const t = metricsMessages.rejectCancel

const eventLabels: Record<string, string> = {
  rejected: t.rejected,
  cancelled: t.cancelled,
}

const columns: DataTableColumn<RejectCancelRow>[] = [
  {
    id: 'event',
    header: t.event,
    cell: (row) => eventLabels[row.eventType] ?? row.eventType,
  },
  { id: 'reason', header: t.reason, cell: (row) => row.reasonName },
  { id: 'tickets', header: t.tickets, cell: (row) => row.tickets },
]

/** Rechazos y cancelaciones agrupados por motivo. */
export function RejectCancelSection({ rows }: { rows: RejectCancelRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={BanIcon} title={metricsMessages.empty} />
  }
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(row) => `${row.eventType}-${row.reasonName}`}
    />
  )
}
