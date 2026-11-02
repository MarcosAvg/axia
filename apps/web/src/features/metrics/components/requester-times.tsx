import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { RequesterTimeRow } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'

function columns(): DataTableColumn<RequesterTimeRow>[] {
  return [
    {
      id: 'name',
      header: 'Solicitante',
      cell: (row) => row.name,
    },
    {
      id: 'tickets',
      header: metricsMessages.table.tickets,
      cell: (row) => row.tickets,
    },
    {
      id: 'validation',
      header: 'Validación',
      cell: (row) => formatMinutes(row.validationMinutes),
    },
    {
      id: 'claim',
      header: 'Reclamación',
      hideBelow: 'md',
      cell: (row) => formatMinutes(row.claimMinutes),
    },
  ]
}

/** Tiempo de validación y reclamación atribuido a cada solicitante. */
export function RequesterTimes({ rows }: { rows: RequesterTimeRow[] }) {
  return (
    <ChartCard title="Tiempos por solicitante">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <DataTable
            columns={columns()}
            rows={rows}
            getRowId={(row) => row.requesterId}
          />
        </div>
      )}
    </ChartCard>
  )
}
