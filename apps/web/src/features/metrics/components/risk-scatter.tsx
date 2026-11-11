import type { Dimension, DimensionGroup } from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import type { RiskMeasure } from '../domain/quality'
import { activeMinutesInMode, riskAverage, riskRate } from '../domain/quality'
import { formatMinutes, formatPercent } from '../domain/metrics'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'

const t = metricsMessages.quality

const RISK_LABELS: Record<RiskMeasure, string> = {
  reopen: metricsMessages.kpi.reopen,
  recapture: metricsMessages.kpi.recapture,
  reassignment: metricsMessages.kpi.reassignment,
}

const RISK_MEASURES = Object.keys(RISK_LABELS) as RiskMeasure[]

interface RiskRow {
  id: string
  name: string
  tickets: number
  rate: number
  active: number
  gap: number
}

function RiskMeasurePicker({
  measure,
  onChange,
}: {
  measure: RiskMeasure
  onChange: (measure: RiskMeasure) => void
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{t.riskMeasure}</span>
      <select
        value={measure}
        aria-label={t.riskMeasure}
        onChange={(event) => onChange(event.target.value as RiskMeasure)}
        className="h-11 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring lg:h-8"
      >
        {RISK_MEASURES.map((key) => (
          <option key={key} value={key}>
            {RISK_LABELS[key]}
          </option>
        ))}
      </select>
    </label>
  )
}

function rowColor(gap: number) {
  if (gap > 0.0001) return 'var(--destructive)'
  if (gap < -0.0001) return 'var(--success)'
  return 'var(--muted-foreground)'
}

function DumbbellRow({
  row,
  average,
  scaleMax,
}: {
  row: RiskRow
  average: number
  scaleMax: number
}) {
  const ratePosition = (row.rate / scaleMax) * 100
  const averagePosition = (average / scaleMax) * 100
  const start = Math.min(ratePosition, averagePosition)
  const width = Math.abs(ratePosition - averagePosition)
  const color = rowColor(row.gap)
  const gapPoints = Math.round(row.gap * 100)
  const gapLabel = `${gapPoints > 0 ? '+' : ''}${gapPoints} pts`
  return (
    <li
      data-risk-row
      className="grid grid-cols-[minmax(6rem,0.9fr)_minmax(6rem,1.4fr)_auto] items-center gap-x-3 gap-y-1"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{row.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {row.tickets} tiquets · {formatMinutes(row.active)}
        </p>
      </div>
      <div className="relative h-6" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <span
          className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full"
          style={{
            left: `${start}%`,
            width: `${width}%`,
            background: color,
          }}
        />
        <span
          className="absolute top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/70"
          style={{ left: `${averagePosition}%` }}
        />
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
          style={{ left: `${ratePosition}%`, background: color }}
        />
      </div>
      <div className="flex min-w-16 flex-col items-end tabular-nums">
        <span className="text-sm font-semibold">{formatPercent(row.rate)}</span>
        <span className="text-[11px] text-muted-foreground">{gapLabel}</span>
      </div>
    </li>
  )
}

function DumbbellLegend({ average }: { average: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-destructive" aria-hidden />
        {t.aboveAverage}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-success" aria-hidden />
        {t.belowAverage}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-px bg-muted-foreground/70" aria-hidden />
        {t.average} {formatPercent(average)}
      </span>
    </div>
  )
}

/** Riesgo de retrabajo por agrupación, comparado con el promedio global. */
export function RiskScatter({
  groups,
  dimension,
  measure,
  mode,
  onMeasureChange,
}: {
  groups: DimensionGroup[]
  dimension: Dimension
  measure: RiskMeasure
  mode: TimeMode
  onMeasureChange: (measure: RiskMeasure) => void
}) {
  const allRows = rowsByDimension(groups, dimension)
  const average = riskAverage(allRows, measure)
  const rows: RiskRow[] = allRows
    .map((row) => {
      const rate = riskRate(row, measure)
      return {
        id: row.id,
        name: row.name || 'Sin dato',
        tickets: row.tickets,
        rate,
        active: activeMinutesInMode(row, mode),
        gap: rate - average,
      }
    })
    .sort((left, right) => right.rate - left.rate)
    .slice(0, 10)
  const scaleMax = Math.max(0.05, average, ...rows.map((row) => row.rate)) * 1.1
  return (
    <ChartCard title={t.risk} hint={t.riskHint}>
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <RiskMeasurePicker measure={measure} onChange={onMeasureChange} />
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {metricsMessages.empty}
          </p>
        ) : (
          <>
            <DumbbellLegend average={average} />
            <ul className="flex flex-col gap-3">
              {rows.map((row) => (
                <DumbbellRow
                  key={row.id}
                  row={row}
                  average={average}
                  scaleMax={scaleMax}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </ChartCard>
  )
}
