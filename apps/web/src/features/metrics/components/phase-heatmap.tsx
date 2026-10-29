import type { DimensionGroup } from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import { formatMinutes } from '../domain/metrics'
import { shareOf } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'

const t = metricsMessages.times

const PHASES = [
  { key: 'response', field: 'avgResponse' },
  { key: 'assignment', field: 'avgAssignment' },
  { key: 'wait', field: 'avgWait' },
  { key: 'active', field: 'avgActive' },
  { key: 'pause', field: 'avgPause' },
  { key: 'validation', field: 'avgValidation' },
] as const

function HeatTable({
  rows,
  max,
}: {
  rows: DimensionGroup['row'][]
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
            {PHASES.map((phase) => (
              <th
                key={phase.key}
                scope="col"
                className="px-2 py-1 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
              >
                {t.phases[phase.key]}
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
              {PHASES.map((phase) => (
                <HeatCell
                  key={phase.key}
                  value={Number(row[phase.field])}
                  max={max.get(phase.field) ?? 1}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Mapa de calor de tiempo por categoría y fase. */
export function PhaseHeatmap({ groups }: { groups: DimensionGroup[] }) {
  const rows = rowsByDimension(groups, 'category').slice(0, 8)
  const max = new Map(
    PHASES.map((phase) => [
      phase.field,
      Math.max(1, ...rows.map((row) => Number(row[phase.field]))),
    ]),
  )
  if (rows.length === 0) {
    return (
      <ChartCard title={t.heatmap}>
        <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
      </ChartCard>
    )
  }
  return (
    <ChartCard title={t.heatmap}>
      <HeatTable rows={rows} max={max} />
      <p className="pt-2 text-xs text-muted-foreground">
        Promedio por tiquet. La intensidad es relativa a la columna.
      </p>
    </ChartCard>
  )
}

function HeatCell({ value, max }: { value: number; max: number }) {
  const intensity = shareOf(value, max)
  return (
    <td
      className="rounded px-2 py-1 text-right tabular-nums"
      style={{
        backgroundColor:
          value > 0
            ? `color-mix(in oklab, var(--chart-1) ${8 + intensity * 57}%, transparent)`
            : undefined,
      }}
    >
      {value > 0 ? formatMinutes(value) : '—'}
    </td>
  )
}
