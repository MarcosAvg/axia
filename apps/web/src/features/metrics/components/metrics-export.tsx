import { Button } from '@/components/ui/button'
import { downloadTextFile } from '@/lib/download'
import { formatMinutes, formatPercent, toCsv } from '../domain/metrics'
import type { DimensionRow } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const t = metricsMessages.table

const XLSX_COLUMNS = [
  { header: t.dimension, key: 'dimension' },
  { header: t.tickets, key: 'tickets' },
  { header: t.avgActive, key: 'avgActive' },
  { header: t.avgTotal, key: 'avgTotal' },
  { header: t.extra, key: 'extra' },
  { header: t.reassignment, key: 'reassignment' },
  { header: t.recapture, key: 'recapture' },
]

const headers = [
  t.dimension,
  t.tickets,
  t.avgActive,
  t.avgTotal,
  t.extra,
  t.reassignment,
  t.recapture,
]

function rowValues(row: DimensionRow, nameOf: (id: string) => string) {
  return [
    nameOf(row.id),
    row.tickets,
    formatMinutes(row.avgActive),
    formatMinutes(row.avgTotal),
    formatMinutes(row.avgActiveExtra),
    formatPercent(row.reassignmentRate),
    formatPercent(row.recaptureRate),
  ]
}

/** Exportación de la tabla por dimensión (CSV y XLSX). */
export function MetricsExport({
  rows,
  nameOf,
}: {
  rows: DimensionRow[]
  nameOf: (id: string) => string
}) {
  async function handleXlsx() {
    const { exportXlsx } = await import('@/lib/excel')
    await exportXlsx(
      'metricas.xlsx',
      t.dimension,
      XLSX_COLUMNS,
      rows.map((row) => {
        const values = rowValues(row, nameOf)
        return Object.fromEntries(
          XLSX_COLUMNS.map((column, index) => [
            column.key,
            values[index] ?? '',
          ]),
        )
      }),
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-9"
        disabled={rows.length === 0}
        onClick={() =>
          downloadTextFile(
            'metricas.csv',
            toCsv(
              headers,
              rows.map((row) => rowValues(row, nameOf)),
            ),
          )
        }
      >
        {metricsMessages.export}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-9"
        disabled={rows.length === 0}
        onClick={() => void handleXlsx()}
      >
        {metricsMessages.exportXlsx}
      </Button>
    </div>
  )
}
