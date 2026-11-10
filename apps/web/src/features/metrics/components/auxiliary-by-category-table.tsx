import { DataTable } from '@/components/shared/data-table'
import type { AuxiliaryCategoryRow } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const t = metricsMessages.team

/** Horas de apoyo auxiliar por técnico y categoría. */
export function AuxiliaryByCategoryTable({
  rows,
}: {
  rows: AuxiliaryCategoryRow[]
}) {
  return (
    <DataTable
      columns={[
        {
          id: 'technician',
          header: t.technician,
          cell: (row) => row.technicianName,
        },
        {
          id: 'category',
          header: t.category,
          cell: (row) => row.categoryName ?? 'Sin categoría',
        },
        {
          id: 'tickets',
          header: metricsMessages.table.tickets,
          cell: (row) => row.tickets,
        },
        {
          id: 'minutes',
          header: metricsMessages.table.avgActive,
          cell: (row) => formatMinutes(row.minutes),
        },
        {
          id: 'labor',
          header: metricsMessages.timeMode.laboral,
          cell: (row) => formatMinutes(row.laborMinutes),
        },
      ]}
      rows={rows}
      getRowId={(row) => `${row.technicianId}-${row.categoryId ?? 'none'}`}
    />
  )
}
