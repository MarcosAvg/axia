import { cn } from 'cn'
import type { TimeMeasure } from '@/lib/time-measure'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DistributionProfileRow } from '../domain/metrics'
import { formatMinutes, formatPercent } from '../domain/metrics'
import { niceTimeScale, type TimeScale } from '../domain/range-scale'
import { metricsMessages } from '../i18n'

const t = metricsMessages.times

const LABEL_COLUMN = 'w-24 shrink-0 sm:w-36'
const VALUE_COLUMN = 'w-20 shrink-0'

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
      <span className="absolute top-1/2 left-0 w-full border-t border-dashed border-border" />
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

function RangeAxis({ scale }: { scale: TimeScale }) {
  return (
    <div
      className="flex items-center gap-2 text-[10px] text-muted-foreground"
      aria-hidden="true"
    >
      <span className={LABEL_COLUMN} />
      <div className="relative h-6 min-w-0 flex-1">
        {scale.ticks.map((tick) => {
          const isFirst = tick === 0
          const isLast = tick === scale.max
          return (
            <span
              key={tick}
              className={cn(
                'absolute top-0 flex flex-col',
                isFirst && 'items-start',
                isLast && '-translate-x-full items-end',
                !isFirst && !isLast && '-translate-x-1/2 items-center',
              )}
              style={{ left: position(tick, scale.max) }}
            >
              <span className="h-1 w-px bg-border" />
              <span
                className={cn(
                  'whitespace-nowrap',
                  !isFirst && !isLast && 'hidden sm:block',
                )}
              >
                {formatMinutes(tick)}
              </span>
            </span>
          )
        })}
      </div>
      <span className={VALUE_COLUMN} />
    </div>
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
    <li className="flex items-center gap-2 text-xs">
      <div className={cn(LABEL_COLUMN, 'min-w-0')}>
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
            className="relative h-5 min-w-0 flex-1 cursor-help rounded-sm border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RangeMarks row={row} max={max} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <RangeTooltipContent row={row} />
        </TooltipContent>
      </Tooltip>
      <span className={cn(VALUE_COLUMN, 'text-right font-medium tabular-nums')}>
        {formatMinutes(valueFor(row, measure))}
      </span>
    </li>
  )
}

function RangeScaleNote({
  scale,
  maxP90,
  measure,
}: {
  scale: TimeScale
  maxP90: number
  measure: TimeMeasure
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      <p>{t.rangeLegend}</p>
      <p>
        {t.rangeScale}: 0–{formatMinutes(scale.max)} · {t.rangeP90Max}:{' '}
        {formatMinutes(maxP90)}
      </p>
      {measure === 'p95' || measure === 'max' ? <p>{t.rangeOverflow}</p> : null}
    </div>
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
  const maxP90 = Math.max(1, ...rows.map((row) => row.p90))
  const scale = niceTimeScale(maxP90)
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <RangeRow
            key={row.phase}
            row={row}
            measure={measure}
            max={scale.max}
          />
        ))}
      </ul>
      <RangeAxis scale={scale} />
      <RangeScaleNote scale={scale} maxP90={maxP90} measure={measure} />
    </div>
  )
}
