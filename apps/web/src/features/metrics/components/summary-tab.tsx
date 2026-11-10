import { statusLabels } from '@/features/tickets'
import type { DimensionGroup } from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import type {
  AgingRow,
  MetricsSummary,
  SatisfactionSummary,
  SlaPriorityRow,
  SlaSummary,
  VolumePoint,
} from '../domain/metrics'
import type { Comparison } from '../domain/period'
import { formatMinutes, formatPercent } from '../domain/metrics'
import { shareOf } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { AgingList } from './aging-list'
import { ChartCard } from './chart-card'
import { CycleBar } from './cycle-bar'
import { HealthStrip } from './health-strip'
import { RankingBars } from './ranking-bars'
import { SatisfactionPanel, SlaPanel } from './sla-panels'
import { StatusChart, StatusTableCard } from './status-distribution'
import { VolumeChart } from './volume-chart'

const statusLabel = (status: string): string =>
  (statusLabels as Record<string, string>)[status] ?? status

function TopCategories({ groups }: { groups: DimensionGroup[] }) {
  const rows = rowsByDimension(groups, 'category')
  const total = rows.reduce((sum, row) => sum + row.tickets, 0)
  const chartRows = rows.slice(0, 6).map((row) => ({
    id: row.id,
    name: row.name || 'Sin dato',
    value: row.tickets,
    label: `${row.tickets} · ${formatPercent(shareOf(row.tickets, total))}`,
  }))
  return (
    <ChartCard
      title={metricsMessages.charts.topCategories}
      hint={metricsMessages.chartHints.countsByDimension}
    >
      {chartRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
      ) : (
        <RankingBars
          rows={chartRows}
          label={metricsMessages.table.tickets}
          height={200}
        />
      )}
    </ChartCard>
  )
}

function OutcomeBreakdown({ groups }: { groups: DimensionGroup[] }) {
  const t = metricsMessages.outcomes
  const rows = rowsByDimension(groups, 'outcome')
  const total = rows.reduce((sum, row) => sum + row.tickets, 0)
  if (rows.length === 0) return null
  return (
    <ChartCard title={t.title} hint={metricsMessages.chartHints.outcomes}>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-muted-foreground">
              {t[row.id as keyof typeof t] ?? row.name}
            </span>
            <span className="tabular-nums">
              {row.tickets} · {formatPercent(shareOf(row.tickets, total))} ·{' '}
              {formatMinutes(row.avgTotal)}
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

function AgingCard({
  aging,
  buckets,
}: {
  aging: AgingRow[]
  buckets: Array<{ bucket: string; tickets: number }>
}) {
  return (
    <ChartCard
      title={metricsMessages.aging.title}
      hint={metricsMessages.chartHints.aging}
    >
      {buckets.length > 0 ? (
        <dl className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {buckets.map((bucket) => (
            <div key={bucket.bucket} className="flex items-baseline gap-1">
              <dt>{bucket.bucket} d</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {bucket.tickets}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="max-h-80 overflow-auto">
        <AgingList rows={aging} statusLabel={statusLabel} />
      </div>
    </ChartCard>
  )
}

function VolumeAndStatus({
  volume,
  groups,
}: {
  volume: VolumePoint[]
  groups: DimensionGroup[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
      <div className="lg:col-span-3">
        <ChartCard
          title={metricsMessages.charts.volume}
          hint={metricsMessages.chartHints.volume}
        >
          <VolumeChart data={volume} />
        </ChartCard>
      </div>
      <div className="lg:col-span-2">
        <StatusChart groups={groups} />
      </div>
    </div>
  )
}

/** Resumen: salud, volumen, estado, categorías, SLA, satisfacción y antigüedad. */
export function SummaryTab({
  volume,
  aging,
  agingBuckets,
  groups,
  summary,
  comparison,
  satisfaction,
  satisfactionDistribution,
  sla,
  slaRows,
  mode,
}: {
  volume: VolumePoint[]
  aging: AgingRow[]
  agingBuckets: Array<{ bucket: string; tickets: number }>
  groups: DimensionGroup[]
  summary: MetricsSummary
  comparison: Comparison | null
  satisfaction: SatisfactionSummary
  satisfactionDistribution: number[]
  sla: SlaSummary
  slaRows: SlaPriorityRow[]
  mode: import('../domain/time-mode').TimeMode
}) {
  return (
    <div className="flex flex-col gap-4">
      <HealthStrip
        summary={summary}
        comparison={comparison}
        satisfaction={satisfaction}
        sla={sla}
        mode={mode}
      />
      <CycleBar summary={summary} mode={mode} />
      <VolumeAndStatus volume={volume} groups={groups} />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <TopCategories groups={groups} />
        <OutcomeBreakdown groups={groups} />
        <SatisfactionPanel
          satisfaction={satisfaction}
          distribution={satisfactionDistribution}
        />
      </div>
      <SlaPanel sla={sla} rows={slaRows} />
      <StatusTableCard groups={groups} />
      <AgingCard aging={aging} buckets={agingBuckets} />
    </div>
  )
}
