import { Button } from '@/components/ui/button'
import { downloadTextFile } from '@/lib/download'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import { formatMinutes, formatPercent, toCsv } from '../domain/metrics'
import { dimensionLabels, metricsMessages } from '../i18n'

const t = metricsMessages.table

const XLSX_COLUMNS = [
  { header: t.dimension, key: 'dimension' },
  { header: t.name, key: 'name' },
  { header: t.tickets, key: 'tickets' },
  { header: t.avgActive, key: 'avgActive' },
  { header: t.avgTotal, key: 'avgTotal' },
  { header: t.extra, key: 'extra' },
  { header: t.reassignment, key: 'reassignment' },
  { header: t.recapture, key: 'recapture' },
]

const headers = [
  t.dimension,
  t.name,
  t.tickets,
  t.avgActive,
  t.avgTotal,
  t.extra,
  t.reassignment,
  t.recapture,
]

function rowValues(
  group: DimensionGroup,
  nameOf: (dimension: Dimension, id: string) => string,
) {
  const { row } = group
  return [
    dimensionLabels[group.dimension],
    nameOf(group.dimension, row.id),
    row.tickets,
    formatMinutes(row.avgActive),
    formatMinutes(row.avgTotal),
    formatMinutes(row.avgActiveExtra),
    formatPercent(row.reassignmentRate),
    formatPercent(row.recaptureRate),
  ]
}

/** Exportación de todas las agrupaciones por dimensión (CSV y XLSX). */
export function MetricsExport({
  groups,
  nameOf,
}: {
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
}) {
  async function handleXlsx() {
    const { exportXlsx } = await import('@/lib/excel')
    await exportXlsx(
      'metricas.xlsx',
      t.dimension,
      XLSX_COLUMNS,
      groups.map((group) => {
        const values = rowValues(group, nameOf)
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
        disabled={groups.length === 0}
        onClick={() =>
          downloadTextFile(
            'metricas.csv',
            toCsv(
              headers,
              groups.map((group) => rowValues(group, nameOf)),
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
        disabled={groups.length === 0}
        onClick={() => void handleXlsx()}
      >
        {metricsMessages.exportXlsx}
      </Button>
    </div>
  )
}
