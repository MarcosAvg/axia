import type { TimeMeasure } from '@/lib/time-measure'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DistributionProfileRow } from '../domain/metrics'
import { formatMinutes, formatPercent } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const t = metricsMessages.times

function phaseLabel(phase: string): string {
  if (phase === 'total') return metricsMessages.kpi.total
  if (phase === 'resolution') return metricsMessages.kpi.resolution
  if (phase === 'reassignment') return metricsMessages.kpi.reassignment
  return (t.phases as Record<string, string>)[phase] ?? phase
}

function valueFor(row: DistributionProfileRow, measure: TimeMeasure): number {
  if (measure === 'median') return row.median
  if (measure === 'p90') return row.p90
  if (measure === 'p95') return row.p95
  if (measure === 'max') return row.max
  return row.mean
}

function position(value: number, max: number): string {
  return `${Math.min(100, Math.max(0, (value / max) * 100))}%`
}

function RangeTooltipContent({ row }: { row: DistributionProfileRow }) {
  const values = [
    [t.sample, String(row.n)],
    [t.p25, formatMinutes(row.p25)],
    [t.median, formatMinutes(row.median)],
    [t.p75, formatMinutes(row.p75)],
    [t.p90, formatMinutes(row.p90)],
    [t.max, formatMinutes(row.max)],
    [t.outliers, `${row.outliers} · ${formatPercent(row.outlierRate)}`],
  ]
  return (
    <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-xs">
      {values.map(([label, value]) => (
        <div key={label} className="contents">
          <span className="text-background/70">{label}</span>
          <span className="text-right tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  )
}

function RangeMarks({
  row,
  max,
}: {
  row: DistributionProfileRow
  max: number
}) {
  const left = position(row.p25, max)
  const width = position(row.p75 - row.p25, max)
  const median = position(row.median, max)
  const p90 = position(row.p90, max)
  return (
    <>
      <span className="absolute inset-y-1/2 left-0 h-px w-full bg-border" />
      <span
        className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-sm bg-chart-1/35"
        style={{ left, width }}
      />
      <span
        className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-1"
        style={{ left: median }}
      />
      <span
        className="absolute top-1/2 h-px bg-chart-1"
        style={{ left: median, width: position(row.p90 - row.median, max) }}
      />
      <span
        className="absolute top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 bg-chart-1/60"
        style={{ left: p90 }}
      />
    </>
  )
}

function RangeRow({
  row,
  measure,
  max,
}: {
  row: DistributionProfileRow
  measure: TimeMeasure
  max: number
}) {
  const label = `${phaseLabel(row.phase)}: P25 ${formatMinutes(
    row.p25,
  )}, mediana ${formatMinutes(row.median)}, P75 ${formatMinutes(
    row.p75,
  )}, P90 ${formatMinutes(row.p90)}`
  return (
    <li className="grid grid-cols-[minmax(6rem,9rem)_1fr_auto] items-center gap-2 text-xs">
      <div className="min-w-0">
        <span className="block truncate text-muted-foreground">
          {phaseLabel(row.phase)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {t.sample} {row.n}
        </span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="relative h-5 w-full cursor-help rounded-sm border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RangeMarks row={row} max={max} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <RangeTooltipContent row={row} />
        </TooltipContent>
      </Tooltip>
      <span className="font-medium tabular-nums">
        {formatMinutes(valueFor(row, measure))}
      </span>
    </li>
  )
}

/** Rango por fase: caja P25–P75, mediana y P90. */
export function PhaseRangeChart({
  profile,
  measure,
}: {
  profile: DistributionProfileRow[]
  measure: TimeMeasure
}) {
  const rows = profile.filter((row) => row.n > 0)
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
    )
  }
  const max = Math.max(1, ...rows.map((row) => row.p90))
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <RangeRow key={row.phase} row={row} measure={measure} max={max} />
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{t.rangeLegend}</p>
    </div>
  )
}
