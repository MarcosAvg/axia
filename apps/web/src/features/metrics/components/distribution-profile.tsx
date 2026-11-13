import { cn } from 'cn'
import { HintIcon } from '@/components/shared/hint'
import { useTimeMeasure } from '@/components/shared/time-measure-context'
import type { TimeMeasure } from '@/lib/time-measure'
import { DISTRIBUTION_COLUMNS } from '../domain/distribution-drill-down'
import type { DistributionColumn } from '../domain/distribution-drill-down'
import type { DistributionProfileRow } from '../domain/metrics'
import { MIN_SAMPLE, formatMinutes, formatPercent } from '../domain/metrics'
import { phaseTicketFilters } from '../domain/drill-down'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { DistributionValueCell } from './distribution-value-cell'
import { MetricCount } from './metric-count'

const t = metricsMessages.times
const hints = metricsMessages.distributionHints

function phaseLabel(phase: string): string {
  if (phase === 'total') return metricsMessages.kpi.total
  if (phase === 'resolution') return metricsMessages.kpi.resolution
  return (t.phases as Record<string, string>)[phase] ?? phase
}

/** Columna que corresponde a la medida activa del tablero. */
function activeColumn(measure: TimeMeasure): string | null {
  if (measure === 'average') return 'mean'
  if (measure === 'total') return null
  return measure
}

function cellClass(active: boolean): string | undefined {
  return active ? 'bg-muted/60 text-foreground' : undefined
}

interface ProfileHeaderColumn {
  key: string
  label: string
  hint?: string
  align?: 'left' | 'right'
}

const HEADERS: ProfileHeaderColumn[] = [
  { key: 'phase', label: t.phase, hint: hints.values, align: 'left' },
  { key: 'sample', label: t.sampleOfTotal, hint: hints.sample },
  { key: 'median', label: t.median, hint: hints.median },
  { key: 'iqr', label: t.iqr, hint: hints.iqr },
  { key: 'p90', label: t.p90, hint: hints.p90 },
  { key: 'max', label: t.max, hint: hints.max },
  { key: 'outliers', label: t.outliers, hint: hints.outliers },
  { key: 'mean', label: t.mean, hint: hints.mean },
]

function ProfileHeader({ active }: { active: string | null }) {
  return (
    <thead>
      <tr className="text-xs text-muted-foreground">
        {HEADERS.map((header) => {
          const isActive = header.key === active
          return (
            <th
              key={header.key}
              data-active={isActive ? 'true' : undefined}
              className={cn(
                'px-2 py-1 font-medium',
                header.align === 'left' ? 'text-left' : 'text-right',
                cellClass(isActive),
              )}
            >
              <span className="inline-flex items-center gap-1">
                {header.label}
                {isActive ? (
                  <span className="rounded bg-muted px-1 text-[10px] font-normal uppercase">
                    {t.active}
                  </span>
                ) : null}
                {header.hint ? (
                  <HintIcon hint={header.hint} label={header.label} />
                ) : null}
              </span>
            </th>
          )
        })}
      </tr>
    </thead>
  )
}

function SampleCell({
  row,
  mode,
}: {
  row: DistributionProfileRow
  mode: TimeMode
}) {
  const filters = phaseTicketFilters(row.phase, mode)
  return (
    <td
      className="px-2 py-1.5 text-right text-xs text-muted-foreground"
      title={`${row.n} de ${row.total} tiquets`}
    >
      <MetricCount
        title={`${metricsMessages.drillDown.label} · ${phaseLabel(row.phase)}`}
        filters={filters ?? {}}
        disabled={!filters || row.n === 0}
      >
        {row.n}
      </MetricCount>{' '}
      / {row.total} · {formatPercent(row.coverage)}
    </td>
  )
}

function cellValue(
  row: DistributionProfileRow,
  column: DistributionColumn,
): string {
  if (column === 'median') return formatMinutes(row.median)
  if (column === 'iqr') {
    return `${formatMinutes(row.p25)}–${formatMinutes(row.p75)}`
  }
  if (column === 'p90') return formatMinutes(row.p90)
  if (column === 'max') return formatMinutes(row.max)
  if (column === 'outliers') {
    return `${row.outliers} · ${formatPercent(row.outlierRate)}`
  }
  return formatMinutes(row.mean)
}

function ProfileRowView({
  row,
  active,
  mode,
}: {
  row: DistributionProfileRow
  active: string | null
  mode: TimeMode
}) {
  const enough = row.n >= MIN_SAMPLE
  const label = phaseLabel(row.phase)
  return (
    <tr className="border-t">
      <th scope="row" className="px-2 py-1.5 text-left font-medium">
        {label}
      </th>
      <SampleCell row={row} mode={mode} />
      {DISTRIBUTION_COLUMNS.map((column) => (
        <td
          key={column}
          className={cn('px-2 py-1.5 text-right', cellClass(active === column))}
        >
          <DistributionValueCell
            row={row}
            mode={mode}
            column={column}
            phaseLabel={label}
            enough={enough}
            alwaysShow={column === 'mean'}
            muted={column === 'mean'}
          >
            {cellValue(row, column)}
          </DistributionValueCell>
        </td>
      ))}
    </tr>
  )
}

function ProfileNote({ measure }: { measure: TimeMeasure }) {
  return (
    <div className="flex flex-col gap-1 pt-2 text-xs text-muted-foreground">
      <p>{t.sampleNote}</p>
      <p>{measure === 'total' ? t.accumulatedNote : t.activeNote}</p>
    </div>
  )
}

/** Perfil por fase: muestra, centro, dispersión y casos extremos. */
export function DistributionProfileCard({
  profile,
  mode,
}: {
  profile: DistributionProfileRow[]
  mode: TimeMode
}) {
  const { measure } = useTimeMeasure()
  const active = activeColumn(measure)
  return (
    <ChartCard title={t.distribution} hint={t.distributionHint}>
      {profile.length === 0 ? (
        <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-sm">
            <ProfileHeader active={active} />
            <tbody>
              {profile.map((row) => (
                <ProfileRowView
                  key={row.phase}
                  row={row}
                  active={active}
                  mode={mode}
                />
              ))}
            </tbody>
          </table>
          <ProfileNote measure={measure} />
        </div>
      )}
    </ChartCard>
  )
}
