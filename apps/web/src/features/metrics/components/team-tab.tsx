import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/data-table'
import type { DimensionGroup } from '../domain/dimensions'
import { rowsByDimension } from '../domain/dimensions'
import type {
  AuxiliaryCategoryRow,
  RoutingSummary,
  SupervisorRow,
  TechnicianRow,
} from '../domain/indicators'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { AuxiliaryByCategoryTable } from './auxiliary-by-category-table'
import { ChartCard } from './chart-card'
import { RoutingStats } from './routing-stats'
import { SupervisorTable } from './supervisor-table'
import { teamColumns } from './team-columns'
import { TechnicianTable } from './technician-table'

const t = metricsMessages.team

function TeamSummary({
  groups,
  mode,
}: {
  groups: DimensionGroup[]
  mode: TimeMode
}) {
  const rows = rowsByDimension(groups, 'team')
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
    )
  }
  return (
    <DataTable
      columns={teamColumns(mode)}
      rows={rows}
      getRowId={(row) => row.id}
    />
  )
}

type TeamView = 'teams' | 'supervisors' | 'technicians'

const VIEWS = [
  ['teams', t.teams],
  ['supervisors', t.supervisors],
  ['technicians', t.technicians],
] as const

function ViewSwitch({
  view,
  onChange,
}: {
  view: TeamView
  onChange: (view: TeamView) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {VIEWS.map(([value, label]) => (
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

function SupervisorsView({
  routing,
  supervisors,
}: {
  routing: RoutingSummary
  supervisors: SupervisorRow[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <ChartCard title={metricsMessages.routing.title}>
        <RoutingStats routing={routing} />
      </ChartCard>
      <ChartCard title={t.supervisors}>
        <SupervisorTable rows={supervisors} />
      </ChartCard>
    </div>
  )
}

function TechniciansView({
  technicians,
  auxiliaryByCategory,
}: {
  technicians: TechnicianRow[]
  auxiliaryByCategory: AuxiliaryCategoryRow[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <ChartCard title={metricsMessages.technicians.title}>
        <div className="max-h-[32rem] overflow-auto">
          <TechnicianTable
            rows={[...technicians].sort(
              (left, right) => right.tickets - left.tickets,
            )}
          />
        </div>
      </ChartCard>
      <ChartCard title={t.auxiliaryByCategory}>
        <div className="max-h-80 overflow-auto">
          <AuxiliaryByCategoryTable rows={auxiliaryByCategory} />
        </div>
      </ChartCard>
    </div>
  )
}

/** Equipo: equipos, supervisores y técnicos. */
export function TeamTab({
  groups,
  routing,
  supervisors,
  technicians,
  auxiliaryByCategory,
  mode,
}: {
  groups: DimensionGroup[]
  mode: TimeMode
  routing: RoutingSummary
  supervisors: SupervisorRow[]
  technicians: TechnicianRow[]
  auxiliaryByCategory: AuxiliaryCategoryRow[]
}) {
  const [view, setView] = useState<TeamView>('teams')
  return (
    <div className="flex flex-col gap-4">
      <ViewSwitch view={view} onChange={setView} />
      {view === 'teams' ? (
        <ChartCard title={t.summary}>
          <TeamSummary groups={groups} mode={mode} />
        </ChartCard>
      ) : null}
      {view === 'supervisors' ? (
        <SupervisorsView routing={routing} supervisors={supervisors} />
      ) : null}
      {view === 'technicians' ? (
        <TechniciansView
          technicians={technicians}
          auxiliaryByCategory={auxiliaryByCategory}
        />
      ) : null}
    </div>
  )
}
