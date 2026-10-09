import { GaugeIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { formatRate } from '../domain/metrics'
import type { SlaPriorityRow } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const t = metricsMessages.sla

/** Cumplimiento de tiempos objetivo por prioridad. */
export function SlaSection({ rows }: { rows: SlaPriorityRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={GaugeIcon} title={t.empty} />
  }
  const columns: DataTableColumn<SlaPriorityRow>[] = [
    { id: 'priority', header: t.priority, cell: (row) => row.priorityName },
    { id: 'withTarget', header: t.withTarget, cell: (row) => row.withTarget },
    { id: 'met', header: t.met, cell: (row) => row.met },
    {
      id: 'rate',
      header: t.rate,
      cell: (row) => formatRate(row.complianceRate),
    },
  ]
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(row) => row.priorityId}
    />
  )
}
