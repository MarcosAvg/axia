import type { DataTableColumn } from '@/components/shared/data-table'
import type {
  TechnicianRow,
  TechnicianSubjectTimeRow,
  TechnicianTimeRow,
} from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
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

function subjectCell(
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
      header: metricsMessages.table.tickets,
      hint: metricsMessages.teamHints.technicianTickets,
      cell: (row) => row.tickets,
    },
    {
      id: 'participation',
      header: t.participation,
      hint: metricsMessages.tableHints.participation,
      cell: (row) => {
        const value = totalInMode(
          row.participationMinutes,
          row.participationLaborMinutes,
          mode,
        )
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
      id: 'active',
      header: t.phases.active,
      hint: metricsMessages.kpiHints.active,
      cell: (row) => timeCell(row.avgActive, row.avgActiveLabor, mode),
    },
    {
      id: 'total',
      header: metricsMessages.kpi.total,
      hint: metricsMessages.kpiHints.total,
      hideBelow: 'md',
      cell: (row) => timeCell(row.avgTotal, row.avgTotalLabor, mode),
    },
    {
      id: 'response',
      header: t.phases.response,
      hint: metricsMessages.kpiHints.response,
      hideBelow: 'xl',
      cell: (row) => timeCell(row.avgResponse, row.avgResponseLabor, mode),
    },
    {
      id: 'assignment',
      header: t.phases.assignment,
      hint: metricsMessages.kpiHints.assignment,
      hideBelow: 'xl',
      cell: (row) => timeCell(row.avgAssignment, row.avgAssignmentLabor, mode),
    },
    {
      id: 'validation',
      header: t.phases.validation,
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
      header: 'Trabajo atribuido',
      hint: metricsMessages.teamHints.attributedActive,
      hideBelow: 'md',
      cell: (row) =>
        subjectCell(row.activeMinutes, row.activeLaborMinutes, mode),
    },
    {
      id: 'attributedPause',
      header: 'Pausa atribuida',
      hint: metricsMessages.teamHints.attributedPause,
      hideBelow: 'xl',
      cell: (row) => subjectCell(row.pauseMinutes, row.pauseLaborMinutes, mode),
    },
    {
      id: 'attributedWait',
      header: 'Espera atribuida',
      hint: metricsMessages.teamHints.attributedWait,
      hideBelow: 'xl',
      cell: (row) => subjectCell(row.waitMinutes, row.waitLaborMinutes, mode),
    },
  ]
}
