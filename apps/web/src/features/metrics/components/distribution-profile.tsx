import type { DistributionProfileRow } from '../domain/metrics'
import { MIN_SAMPLE, formatMinutes, formatPercent } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'

const t = metricsMessages.times

function phaseLabel(phase: string): string {
  if (phase === 'total') return metricsMessages.kpi.total
  if (phase === 'resolution') return metricsMessages.kpi.resolution
  return (t.phases as Record<string, string>)[phase] ?? phase
}

function RobustValue({
  enough,
  children,
}: {
  enough: boolean
  children: string
}) {
  if (!enough) {
    return (
      <span title={t.insufficientSample} className="text-muted-foreground">
        —
      </span>
    )
  }
  return <span className="tabular-nums">{children}</span>
}

function ProfileHeader() {
  const headers = [
    t.phase,
    t.sample,
    t.median,
    t.iqr,
    t.p90,
    t.max,
    t.outliers,
    t.mean,
  ]
  return (
    <thead>
      <tr className="text-xs text-muted-foreground">
        {headers.map((header, index) => (
          <th
            key={header}
            className={`px-2 py-1 font-medium ${
              index === 0 ? 'text-left' : 'text-right'
            }`}
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function ProfileRowView({ row }: { row: DistributionProfileRow }) {
  const enough = row.n >= MIN_SAMPLE
  return (
    <tr className="border-t">
      <th scope="row" className="px-2 py-1.5 text-left font-medium">
        {phaseLabel(row.phase)}
      </th>
      <td
        className="px-2 py-1.5 text-right text-xs text-muted-foreground"
        title={`${row.n} de ${metricsMessages.table.tickets}`}
      >
        {row.n} · {formatPercent(row.coverage)}
      </td>
      <td className="px-2 py-1.5 text-right">
        <RobustValue enough={enough}>{formatMinutes(row.median)}</RobustValue>
      </td>
      <td className="px-2 py-1.5 text-right">
        <RobustValue enough={enough}>
          {`${formatMinutes(row.p25)}–${formatMinutes(row.p75)}`}
        </RobustValue>
      </td>
      <td className="px-2 py-1.5 text-right">
        <RobustValue enough={enough}>{formatMinutes(row.p90)}</RobustValue>
      </td>
      <td className="px-2 py-1.5 text-right">
        <RobustValue enough={enough}>{formatMinutes(row.max)}</RobustValue>
      </td>
      <td className="px-2 py-1.5 text-right">
        <RobustValue enough={enough}>
          {`${row.outliers} · ${formatPercent(row.outlierRate)}`}
        </RobustValue>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
        {formatMinutes(row.mean)}
      </td>
    </tr>
  )
}

/** Perfil por fase: muestra, centro, dispersión y casos extremos. */
export function DistributionProfileCard({
  profile,
}: {
  profile: DistributionProfileRow[]
}) {
  return (
    <ChartCard title={t.distribution} hint={t.distributionHint}>
      {profile.length === 0 ? (
        <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-sm">
            <ProfileHeader />
            <tbody>
              {profile.map((row) => (
                <ProfileRowView key={row.phase} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  )
}
