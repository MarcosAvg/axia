import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { RequesterTimeRow } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { totalInMode, type TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'

const t = metricsMessages.times

function columns(mode: TimeMode): DataTableColumn<RequesterTimeRow>[] {
  return [
    {
      id: 'name',
      header: t.requester,
      cell: (row) => row.name,
    },
    {
      id: 'tickets',
      header: metricsMessages.table.tickets,
      hint: metricsMessages.teamHints.requesterTickets,
      cell: (row) => row.tickets,
    },
    {
      id: 'validation',
      header: t.phases.validation,
      hint: metricsMessages.teamHints.requesterValidation,
      cell: (row) =>
        formatMinutes(
          totalInMode(row.validationMinutes, row.validationLaborMinutes, mode),
        ),
    },
    {
      id: 'claim',
      header: t.phases.claim,
      hint: metricsMessages.teamHints.requesterClaim,
      hideBelow: 'md',
      cell: (row) =>
        formatMinutes(
          totalInMode(row.claimMinutes, row.claimLaborMinutes, mode),
        ),
    },
  ]
}

/** Tiempo de validación y reclamación atribuido a cada solicitante. */
export function RequesterTimes({
  rows,
  mode,
}: {
  rows: RequesterTimeRow[]
  mode: TimeMode
}) {
  return (
    <ChartCard
      title={t.requesters}
      hint={metricsMessages.chartHints.requesterTimes}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <DataTable
            columns={columns(mode)}
            rows={rows}
            getRowId={(row) => row.requesterId}
          />
        </div>
      )}
    </ChartCard>
  )
}
