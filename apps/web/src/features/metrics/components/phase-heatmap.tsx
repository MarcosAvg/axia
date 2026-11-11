import type { DimensionGroup } from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import { formatMinutes } from '../domain/metrics'
import { shareOf } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { modeValue, type TimeMode } from '../domain/time-mode'
import { ChartCard } from './chart-card'

const t = metricsMessages.times

const PHASES = [
  { key: 'response' },
  { key: 'assignment' },
  { key: 'pending_take' },
  { key: 'wait' },
  { key: 'active' },
  { key: 'pause' },
  { key: 'dormant' },
  { key: 'validation' },
  { key: 'claim' },
] as const

function phaseValue(
  row: DimensionGroup['row'],
  phase: (typeof PHASES)[number]['key'],
  mode: TimeMode,
) {
  return modeValue(
    row as unknown as Record<string, number>,
    phase,
    mode,
    'average',
  )
}

function HeatTable({
  rows,
  max,
  mode,
}: {
  rows: DimensionGroup['row'][]
  max: Map<string, number>
  mode: TimeMode
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-xs font-medium text-muted-foreground">
              {metricsMessages.table.name}
            </th>
            {PHASES.map((phase) => (
              <th
                key={phase.key}
                scope="col"
                className="px-2 py-1 text-right text-xs font-medium text-muted-foreground"
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
                  value={phaseValue(row, phase.key, mode)}
                  max={max.get(phase.key) ?? 1}
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
export function PhaseHeatmap({
  groups,
  mode,
}: {
  groups: DimensionGroup[]
  mode: TimeMode
}) {
  const rows = rowsByDimension(groups, 'category').slice(0, 8)
  const max = new Map(
    PHASES.map((phase) => [
      phase.key,
      Math.max(1, ...rows.map((row) => phaseValue(row, phase.key, mode))),
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
      <HeatTable rows={rows} max={max} mode={mode} />
      <p className="pt-2 text-xs text-muted-foreground">
        Promedio por tiquet en el reloj activo. La intensidad es relativa a la
        columna.
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
