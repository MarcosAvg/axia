import { statusLabels } from '@/features/tickets'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { DimensionGroup } from '../domain/dimensions'
import { formatPercent } from '../domain/metrics'
import { shareOf } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'

const t = metricsMessages.status

const FAMILIES = [
  {
    key: 'initial',
    statuses: ['registered', 'with_supervisor', 'assigned'],
    color: 'var(--chart-1)',
  },
  {
    key: 'progress',
    statuses: ['in_progress'],
    color: 'var(--chart-2)',
  },
  {
    key: 'paused',
    statuses: ['paused'],
    color: 'var(--warning)',
  },
  {
    key: 'validation',
    statuses: ['attended', 'under_claim'],
    color: 'var(--chart-4)',
  },
  {
    key: 'closed',
    statuses: ['closed'],
    color: 'var(--success)',
  },
  {
    key: 'discarded',
    statuses: ['rejected', 'cancelled', 'duplicate'],
    color: 'var(--destructive)',
  },
] as const

const STATUS_ORDER = [
  'registered',
  'with_supervisor',
  'assigned',
  'in_progress',
  'paused',
  'attended',
  'under_claim',
  'closed',
  'rejected',
  'cancelled',
  'duplicate',
]

interface StatusRow {
  status: string
  label: string
  tickets: number
}

interface StatusFamily {
  key: string
  label: string
  color: string
  tickets: number
}

function StatusBar({
  families,
  total,
}: {
  families: StatusFamily[]
  total: number
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-8 w-full overflow-hidden rounded-lg bg-muted"
        aria-hidden
      >
        {families.map((family) => (
          <span
            key={family.key}
            className="h-full"
            style={{
              width: `${shareOf(family.tickets, total) * 100}%`,
              background: family.color,
            }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {families.map((family) => (
          <li key={family.key} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: family.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{family.label}</span>
            <span className="font-medium tabular-nums">
              {formatPercent(shareOf(family.tickets, total))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatusTable({ rows, total }: { rows: StatusRow[]; total: number }) {
  const columns: DataTableColumn<StatusRow>[] = [
    { id: 'label', header: t.detail, cell: (row) => row.label },
    { id: 'tickets', header: t.tickets, cell: (row) => row.tickets },
    {
      id: 'share',
      header: t.share,
      cell: (row) => formatPercent(shareOf(row.tickets, total)),
    },
  ]
  return (
    <DataTable columns={columns} rows={rows} getRowId={(row) => row.status} />
  )
}

/** Distribución del estado actual, por familias y detalle. */
export function StatusDistribution({ groups }: { groups: DimensionGroup[] }) {
  const statusRows = groups
    .filter((group) => group.dimension === 'status')
    .map((group) => group.row)
  const byStatus = new Map(statusRows.map((row) => [row.id, row]))
  const rows: StatusRow[] = STATUS_ORDER.map((status) => ({
    status,
    label: (statusLabels as Record<string, string>)[status] ?? status,
    tickets: byStatus.get(status)?.tickets ?? 0,
  }))
  const total = rows.reduce((sum, row) => sum + row.tickets, 0)
  const families = FAMILIES.map((family) => ({
    ...family,
    label: t.families[family.key],
    tickets: family.statuses.reduce(
      (sum, status) => sum + (byStatus.get(status)?.tickets ?? 0),
      0,
    ),
  })).filter((family) => family.tickets > 0)

  return (
    <ChartCard title={t.title} hint={metricsMessages.chartHints.status}>
      <div className="flex flex-col gap-4">
        <StatusBar families={families} total={total} />
        <div className="max-h-72 overflow-auto">
          <StatusTable rows={rows} total={total} />
        </div>
        <p className="text-xs text-muted-foreground">{t.scroll}</p>
      </div>
    </ChartCard>
  )
}
