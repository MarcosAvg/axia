import type { DataTableColumn } from '@/components/shared/data-table'
import type {
  TechnicianRow,
  TechnicianSubjectTimeRow,
  TechnicianTimeRow,
} from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { technicianParticipation } from '../domain/team'
import { totalInMode, type TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { BarCell } from './bar-cell'

const t = metricsMessages.times

export type TechnicianView = TechnicianRow &
  Partial<TechnicianTimeRow> &
  Partial<TechnicianSubjectTimeRow>

function timeCell(
  value: number | undefined,
  labor: number | undefined,
  mode: TimeMode,
) {
  return value === undefined
    ? '—'
    : formatMinutes(totalInMode(value, labor ?? 0, mode))
}

export function identityColumns(
  maxParticipation: number,
  mode: TimeMode,
): DataTableColumn<TechnicianView>[] {
  return [
    {
      id: 'name',
      header: metricsMessages.technicians.technician,
      cell: (row) => row.name,
    },
    {
      id: 'tickets',
      header: t.participatedTickets,
      hint: metricsMessages.teamHints.technicianTickets,
      cell: (row) => row.tickets,
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
  ]
}

export function timeColumns(mode: TimeMode): DataTableColumn<TechnicianView>[] {
  return [
    {
      id: 'ledTickets',
      header: t.ledTickets,
      hint: metricsMessages.teamHints.ledTickets,
      cell: (row) => row.ledTickets ?? 0,
    },
    {
      id: 'active',
      header: metricsMessages.table.activeAverage,
      hint: metricsMessages.kpiHints.active,
      cell: (row) => timeCell(row.avgActive, row.avgActiveLabor, mode),
    },
    {
      id: 'total',
      header: metricsMessages.table.totalAverage,
      hint: metricsMessages.tableHints.avgTotal,
      hideBelow: 'md',
      cell: (row) => timeCell(row.avgTotal, row.avgTotalLabor, mode),
    },
    {
      id: 'response',
      header: t.averages.response,
      hint: metricsMessages.kpiHints.response,
      hideBelow: 'xl',
      cell: (row) => timeCell(row.avgResponse, row.avgResponseLabor, mode),
    },
    {
      id: 'assignment',
      header: t.averages.assignment,
      hint: metricsMessages.kpiHints.assignment,
      hideBelow: 'xl',
      cell: (row) => timeCell(row.avgAssignment, row.avgAssignmentLabor, mode),
    },
    {
      id: 'validation',
      header: t.averages.validation,
      hint: metricsMessages.kpiHints.validation,
      hideBelow: 'xl',
      cell: (row) => timeCell(row.avgValidation, row.avgValidationLabor, mode),
    },
  ]
}

export function subjectColumns(
  mode: TimeMode,
): DataTableColumn<TechnicianView>[] {
  return [
    {
      id: 'attributedActive',
      header: t.attributed.active,
      hint: metricsMessages.teamHints.attributedActive,
      hideBelow: 'md',
      cell: (row) => timeCell(row.activeMinutes, row.activeLaborMinutes, mode),
    },
    {
      id: 'attributedPause',
      header: t.attributed.pause,
      hint: metricsMessages.teamHints.attributedPause,
      hideBelow: 'xl',
      cell: (row) => timeCell(row.pauseMinutes, row.pauseLaborMinutes, mode),
    },
    {
      id: 'attributedWait',
      header: t.attributed.wait,
      hint: metricsMessages.teamHints.attributedWait,
      hideBelow: 'xl',
      cell: (row) => timeCell(row.waitMinutes, row.waitLaborMinutes, mode),
    },
  ]
}
