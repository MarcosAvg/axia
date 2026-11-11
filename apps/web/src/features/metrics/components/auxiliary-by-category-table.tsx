import { useState } from 'react'
import { DataTable } from '@/components/shared/data-table'
import { Input } from '@/components/ui/input'
import type { AuxiliaryCategoryRow } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { auxiliaryMinutes } from '../domain/team'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'

const t = metricsMessages.team

/** Participación auxiliar por técnico y categoría en el reloj activo. */
export function AuxiliaryByCategoryTable({
  rows,
  mode,
}: {
  rows: AuxiliaryCategoryRow[]
  mode: TimeMode
}) {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()
  const filtered = term
    ? rows.filter((row) =>
        `${row.technicianName} ${row.categoryName ?? ''}`
          .toLowerCase()
          .includes(term),
      )
    : rows
  return (
    <div className="flex flex-col gap-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t.search}
        aria-label={t.search}
        className="max-w-sm"
      />
      <div className="max-h-80 overflow-auto">
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
              header: t.auxiliaryParticipation,
              cell: (row) => formatMinutes(auxiliaryMinutes(row, mode)),
            },
          ]}
          rows={filtered}
          getRowId={(row) => `${row.technicianId}-${row.categoryId ?? 'none'}`}
        />
      </div>
    </div>
  )
}
