import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { DimensionGroup } from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import type {
  RoutingSummary,
  SupervisorRow,
  TechnicianRow,
} from '../domain/indicators'
import type { DimensionRow } from '../domain/dimensions'
import { formatMinutes, formatPercent } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { StackedBarCell } from './bar-cell'
import { ChartCard } from './chart-card'
import { RoutingStats } from './routing-stats'
import { SupervisorTable } from './supervisor-table'
import { TechnicianTable } from './technician-table'

const t = metricsMessages.team

const TEAM_COLUMNS: DataTableColumn<DimensionRow>[] = [
  {
    id: 'name',
    header: metricsMessages.team.teams,
    cell: (row) => row.name || 'Sin dato',
  },
  {
    id: 'tickets',
    header: metricsMessages.table.tickets,
    cell: (row) => row.tickets,
  },
  {
    id: 'status',
    header: `${t.open} / ${t.closed}`,
    cell: (row) => (
      <StackedBarCell
        segments={[
          { key: 'open', value: row.open, color: 'var(--warning)' },
          {
            key: 'closed',
            value: row.closed,
            color: 'var(--success)',
          },
        ]}
        label={`${row.open} / ${row.closed}`}
        className="min-w-32"
      />
    ),
  },
  {
    id: 'active',
    header: metricsMessages.table.avgActive,
    hideBelow: 'lg',
    cell: (row) => formatMinutes(row.avgActive),
  },
  {
    id: 'total',
    header: metricsMessages.table.avgTotal,
    hideBelow: 'xl',
    cell: (row) => formatMinutes(row.avgTotal),
  },
  {
    id: 'reassignment',
    header: metricsMessages.table.reassignment,
    hideBelow: 'md',
    cell: (row) => formatPercent(row.reassignmentRate),
  },
  {
    id: 'reopen',
    header: metricsMessages.kpi.reopen,
    hideBelow: 'md',
    cell: (row) => formatPercent(row.reopenRate),
  },
  {
    id: 'firstFix',
    header: metricsMessages.quality.firstFix,
    hideBelow: 'xl',
    cell: (row) => formatPercent(row.firstFixRate),
  },
]

function TeamSummary({ groups }: { groups: DimensionGroup[] }) {
  const rows = rowsByDimension(groups, 'team')
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
    )
  }
  return (
    <DataTable columns={TEAM_COLUMNS} rows={rows} getRowId={(row) => row.id} />
  )
}

type TeamView = 'teams' | 'supervisors' | 'technicians'

function ViewSwitch({
  view,
  onChange,
}: {
  view: TeamView
  onChange: (view: TeamView) => void
}) {
  const views = [
    ['teams', t.teams],
    ['supervisors', t.supervisors],
    ['technicians', t.technicians],
  ] as const
  return (
    <div className="flex flex-wrap items-center gap-1">
      {views.map(([value, label]) => (
        <Button
          key={value}
          type="button"
          variant={view === value ? 'secondary' : 'ghost'}
          aria-pressed={view === value}
          className="min-h-11 px-3 lg:min-h-8"
          onClick={() => onChange(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}

/** Equipo: equipos, supervisores y técnicos. */
export function TeamTab({
  groups,
  routing,
  supervisors,
  technicians,
}: {
  groups: DimensionGroup[]
  routing: RoutingSummary
  supervisors: SupervisorRow[]
  technicians: TechnicianRow[]
}) {
  const [view, setView] = useState<TeamView>('teams')
  return (
    <div className="flex flex-col gap-4">
      <ViewSwitch view={view} onChange={setView} />
      {view === 'teams' ? (
        <ChartCard title={t.summary}>
          <TeamSummary groups={groups} />
        </ChartCard>
      ) : null}
      {view === 'supervisors' ? (
        <div className="flex flex-col gap-4">
          <ChartCard title={metricsMessages.routing.title}>
            <RoutingStats routing={routing} />
          </ChartCard>
          <ChartCard title={t.supervisors}>
            <SupervisorTable rows={supervisors} />
          </ChartCard>
        </div>
      ) : null}
      {view === 'technicians' ? (
        <ChartCard title={metricsMessages.technicians.title}>
          <div className="max-h-[32rem] overflow-auto">
            <TechnicianTable
              rows={[...technicians].sort(
                (left, right) => right.tickets - left.tickets,
              )}
            />
          </div>
        </ChartCard>
      ) : null}
    </div>
  )
}
