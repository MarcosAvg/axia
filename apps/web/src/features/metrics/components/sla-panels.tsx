import { GaugeIcon } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import type {
  SatisfactionSummary,
  SlaPriorityRow,
  SlaSummary,
} from '../domain/metrics'
import { formatMinutes, formatRate, formatScore } from '../domain/metrics'
import { shareOf } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'

const t = metricsMessages.sla
const k = metricsMessages.kpi
const hints = metricsMessages.kpiHints

function minutes(value: number | null): string {
  return value === null ? '—' : formatMinutes(value)
}

function BulletRows({ rows }: { rows: SlaPriorityRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={GaugeIcon} title={t.empty} />
  }
  return (
    <ul className="flex flex-col divide-y">
      {rows.map((row) => {
        const percent = Math.min(
          100,
          Math.max(0, Math.round((row.complianceRate ?? 0) * 100)),
        )
        return (
          <li
            key={row.priorityId}
            className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[minmax(7rem,1fr)_2fr_auto] sm:items-center sm:gap-4"
          >
            <span className="text-sm">{row.priorityName}</span>
            <span
              className="relative h-2 overflow-hidden rounded-full bg-muted"
              aria-hidden
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-chart-2"
                style={{ width: `${percent}%` }}
              />
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatRate(row.complianceRate)} · {row.met}/{row.withTarget}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** Cumplimiento de SLA por prioridad. */
export function SlaPanel({
  sla,
  rows,
}: {
  sla: SlaSummary
  rows: SlaPriorityRow[]
}) {
  return (
    <ChartCard title={t.title} hint={metricsMessages.chartHints.sla}>
      <div className="flex flex-col gap-3">
        <BulletRows rows={rows} />
        <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-2 text-xs">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">{t.rate}:</dt>
            <dd className="font-medium tabular-nums">
              {formatRate(sla.complianceRate)}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">{t.met}:</dt>
            <dd className="font-medium tabular-nums">
              {sla.met} / {sla.withTarget}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">{t.resolution}:</dt>
            <dd className="font-medium tabular-nums">
              {minutes(sla.avgResolutionMinutes)}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">{t.target}:</dt>
            <dd className="font-medium tabular-nums">
              {minutes(sla.avgTargetMinutes)}
            </dd>
          </div>
        </dl>
      </div>
    </ChartCard>
  )
}

/** Promedio y distribución de calificaciones. */
export function SatisfactionPanel({
  satisfaction,
  distribution,
}: {
  satisfaction: SatisfactionSummary
  distribution: number[]
}) {
  const average = satisfaction.average
  const percent =
    average === null ? 0 : Math.min(100, Math.max(0, (average / 5) * 100))
  const counts = [1, 2, 3, 4, 5].map((score) => distribution[score - 1] ?? 0)
  const maxCount = Math.max(1, ...counts)
  return (
    <ChartCard title={k.satisfaction} hint={hints.satisfaction}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div
            role="img"
            aria-label={`${k.satisfaction}: ${formatScore(average)}`}
            className="relative size-24 shrink-0 rounded-full"
            style={{
              background: `conic-gradient(var(--chart-1) ${percent}%, var(--muted) 0)`,
            }}
          >
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-card text-xl font-semibold tabular-nums">
              {average === null ? '—' : average.toFixed(1)}
            </div>
          </div>
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="text-muted-foreground">de 5</span>
            <span className="text-xs text-muted-foreground">
              {satisfaction.ratings} {t.ratings}
            </span>
          </div>
        </div>
        <ul className="flex flex-col gap-1 text-xs">
          {counts.map((count, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="w-3 text-muted-foreground">{index + 1}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-chart-1"
                  style={{ width: `${shareOf(count, maxCount) * 100}%` }}
                />
              </span>
              <span className="w-6 text-right tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  )
}
