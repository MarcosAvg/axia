import { useState } from 'react'
import type {
  Dimension,
  DimensionGroup,
  DimensionRow,
} from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import { formatPercent } from '../domain/metrics'
import { shareOf } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { DimensionPicker } from './dimension-picker'

const t = metricsMessages.quality

const RATES = [
  { key: 'reassignmentRate', label: metricsMessages.table.reassignment },
  { key: 'recaptureRate', label: metricsMessages.table.recapture },
  { key: 'reopenRate', label: metricsMessages.kpi.reopen },
  { key: 'firstFixRate', label: t.firstFix },
] as const

function QualityTable({
  rows,
  max,
}: {
  rows: DimensionRow[]
  max: Map<string, number>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {metricsMessages.table.name}
            </th>
            {RATES.map((rate) => (
              <th
                key={rate.key}
                scope="col"
                className="px-2 py-1 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
              >
                {rate.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th
                scope="row"
                className="max-w-44 truncate px-2 py-1 text-left font-normal"
              >
                {row.name || 'Sin dato'}
              </th>
              {RATES.map((rate) => (
                <RateCell
                  key={rate.key}
                  value={Number(row[rate.key])}
                  max={max.get(rate.key) ?? 1}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Mapa de calor de tasas de calidad por dimensión. */
export function QualityHeatmap({ groups }: { groups: DimensionGroup[] }) {
  const [dimension, setDimension] = useState<Dimension>('category')
  const rows = rowsByDimension(groups, dimension).slice(0, 10)
  const max = new Map(
    RATES.map((rate) => [
      rate.key,
      Math.max(1, ...rows.map((row) => Number(row[rate.key]))),
    ]),
  )
  return (
    <ChartCard title={t.byDimension}>
      <div className="flex flex-col gap-3">
        <DimensionPicker value={dimension} onChange={setDimension} />
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {metricsMessages.empty}
          </p>
        ) : (
          <QualityTable rows={rows} max={max} />
        )}
        <p className="text-xs text-muted-foreground">
          Intensidad relativa por columna; no es un umbral de bueno o malo.
        </p>
      </div>
    </ChartCard>
  )
}

function RateCell({ value, max }: { value: number; max: number }) {
  return (
    <td
      className="rounded px-2 py-1 text-right tabular-nums"
      style={{
        backgroundColor:
          value > 0
            ? `color-mix(in oklab, var(--chart-1) ${8 + shareOf(value, max) * 57}%, transparent)`
            : undefined,
      }}
    >
      {formatPercent(value)}
    </td>
  )
}
