import type { DataTableColumn } from '@/components/shared/data-table'
import { formatMinutes } from '../domain/metrics'
import { technicianParticipation } from '../domain/team'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { BarCell } from './bar-cell'
import {
  formatTechnicianTime,
  TechnicianDetail,
  type TechnicianView,
} from './technician-detail'

const t = metricsMessages.times

function leadershipColumns(mode: TimeMode): DataTableColumn<TechnicianView>[] {
  return [
    {
      id: 'ledTickets',
      header: t.ledTickets,
      hint: metricsMessages.teamHints.ledTickets,
      cell: (row) => row.ledTickets ?? 0,
    },
    {
      id: 'avgActive',
      header: metricsMessages.table.activeAverage,
      hint: metricsMessages.teamHints.technicianAvgActive,
      cell: (row) =>
        formatTechnicianTime(row.avgActive, row.avgActiveLabor, mode),
    },
    {
      id: 'avgTotal',
      header: metricsMessages.table.totalAverage,
      hint: metricsMessages.teamHints.technicianAvgTotal,
      cell: (row) =>
        formatTechnicianTime(row.avgTotal, row.avgTotalLabor, mode),
    },
  ]
}

export function technicianColumns(
  maxParticipation: number,
  mode: TimeMode,
): DataTableColumn<TechnicianView>[] {
  return [
    {
      id: 'name',
      header: metricsMessages.technicians.technician,
      cell: (row) => <TechnicianDetail row={row} mode={mode} />,
    },
    {
      id: 'tickets',
      header: t.participatedTickets,
      hint: metricsMessages.teamHints.technicianTickets,
      cell: (row) => row.tickets,
    },
    {
      id: 'active',
      header: t.accumulatedTimes.active,
      hint: metricsMessages.teamHints.technicianActive,
      cell: (row) =>
        formatTechnicianTime(row.activeMinutes, row.activeLaborMinutes, mode),
    },
    {
      id: 'participation',
      header: metricsMessages.technicians.participation,
      hint: metricsMessages.tableHints.participation,
      cell: (row) => {
        const value = technicianParticipation(row, mode)
        return (
          <BarCell
            value={value}
            max={maxParticipation}
            label={formatMinutes(value)}
            className="min-w-40"
          />
        )
      },
    },
    ...leadershipColumns(mode),
  ]
}
