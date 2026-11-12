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
import { BentoGrid } from './bento-grid'
import type { BentoItem } from './bento-grid'
import { ChartCard } from './chart-card'
import { HealthStrip } from './health-strip'
import { RankingBars } from './ranking-bars'
import { SatisfactionPanel, SlaPanel } from './sla-panels'
import { StatusChart } from './status-distribution'
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
      hint={metricsMessages.chartHints.topCategories}
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
      <div className="flex flex-col gap-2 sm:min-h-52 sm:justify-center">
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

function volumeItem(volume: VolumePoint[]): BentoItem {
  return {
    key: 'volume',
    className: 'md:col-span-3 xl:col-span-7',
    rowGroup: 'primary',
    content: (
      <ChartCard
        title={metricsMessages.charts.volume}
        hint={metricsMessages.chartHints.volume}
      >
        <VolumeChart data={volume} />
      </ChartCard>
    ),
  }
}

function statusItem(groups: DimensionGroup[]): BentoItem {
  return {
    key: 'status',
    className: 'md:col-span-3 xl:col-span-5',
    rowGroup: 'primary',
    content: <StatusChart groups={groups} />,
  }
}

function categoriesItem(groups: DimensionGroup[]): BentoItem {
  return {
    key: 'categories',
    className: 'md:col-span-3 xl:col-span-4',
    rowGroup: 'secondary',
    content: <TopCategories groups={groups} />,
  }
}

function outcomesItem(groups: DimensionGroup[]): BentoItem {
  return {
    key: 'outcomes',
    className: 'md:col-span-3 xl:col-span-4',
    rowGroup: 'secondary',
    content: <OutcomeBreakdown groups={groups} />,
  }
}

function satisfactionItem(
  satisfaction: SatisfactionSummary,
  distribution: number[],
): BentoItem {
  return {
    key: 'satisfaction',
    className: 'md:col-span-6 xl:col-span-4',
    rowGroup: 'secondary',
    content: (
      <SatisfactionPanel
        satisfaction={satisfaction}
        distribution={distribution}
      />
    ),
  }
}

function slaItem(sla: SlaSummary, rows: SlaPriorityRow[]): BentoItem {
  return {
    key: 'sla',
    className: 'md:col-span-6 xl:col-span-12',
    content: <SlaPanel sla={sla} rows={rows} />,
  }
}

function SummaryBento({
  volume,
  groups,
  satisfaction,
  satisfactionDistribution,
  sla,
  slaRows,
}: {
  volume: VolumePoint[]
  groups: DimensionGroup[]
  satisfaction: SatisfactionSummary
  satisfactionDistribution: number[]
  sla: SlaSummary
  slaRows: SlaPriorityRow[]
}) {
  return (
    <BentoGrid
      items={[
        volumeItem(volume),
        statusItem(groups),
        categoriesItem(groups),
        outcomesItem(groups),
        satisfactionItem(satisfaction, satisfactionDistribution),
        slaItem(sla, slaRows),
      ]}
    />
  )
}

/** Resumen: salud, bento de indicadores y antigüedad. */
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
}) {
  return (
    <div className="flex flex-col gap-4">
      <HealthStrip
        summary={summary}
        groups={groups}
        comparison={comparison}
        satisfaction={satisfaction}
        sla={sla}
      />
      <SummaryBento
        volume={volume}
        groups={groups}
        satisfaction={satisfaction}
        satisfactionDistribution={satisfactionDistribution}
        sla={sla}
        slaRows={slaRows}
      />
      <AgingCard aging={aging} buckets={agingBuckets} />
    </div>
  )
}
