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
      cell: (row) => row.tickets,
    },
    {
      id: 'participation',
      header: t.participation,
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
      cell: (row) => timeCell(row.avgActive, row.avgActiveLabor, mode),
    },
    {
      id: 'total',
      header: metricsMessages.kpi.total,
      hideBelow: 'md',
      cell: (row) => timeCell(row.avgTotal, row.avgTotalLabor, mode),
    },
    {
      id: 'response',
      header: t.phases.response,
      hideBelow: 'xl',
      cell: (row) => timeCell(row.avgResponse, row.avgResponseLabor, mode),
    },
    {
      id: 'assignment',
      header: t.phases.assignment,
      hideBelow: 'xl',
      cell: (row) => timeCell(row.avgAssignment, row.avgAssignmentLabor, mode),
    },
    {
      id: 'validation',
      header: t.phases.validation,
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
      hideBelow: 'md',
      cell: (row) =>
        subjectCell(row.activeMinutes, row.activeLaborMinutes, mode),
    },
    {
      id: 'attributedPause',
      header: 'Pausa atribuida',
      hideBelow: 'xl',
      cell: (row) => subjectCell(row.pauseMinutes, row.pauseLaborMinutes, mode),
    },
    {
      id: 'attributedWait',
      header: 'Espera atribuida',
      hideBelow: 'xl',
      cell: (row) => subjectCell(row.waitMinutes, row.waitLaborMinutes, mode),
    },
  ]
}
