import { Button } from '@/components/ui/button'
import { ButtonGrid } from '@/components/shared/button-grid'
import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import { downloadTextFile } from '@/lib/download'
import { aggregationLabel, timeValue } from '@/lib/time-aggregation'
import type { TimeAggregation } from '@/lib/time-aggregation'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import { formatMinutes, formatPercent, toCsv } from '../domain/metrics'
import { dimensionLabels, metricsMessages } from '../i18n'

const t = metricsMessages.table

const XLSX_KEYS = [
  'dimension',
  'name',
  'tickets',
  'avgActive',
  'avgTotal',
  'extra',
  'reassignment',
  'recapture',
] as const

function headers(aggregation: TimeAggregation): string[] {
  return [
    t.dimension,
    t.name,
    t.tickets,
    aggregationLabel(t.avgActive, aggregation),
    aggregationLabel(t.avgTotal, aggregation),
    t.extra,
    t.reassignment,
    t.recapture,
  ]
}

function rowValues(
  group: DimensionGroup,
  nameOf: (dimension: Dimension, id: string) => string,
  aggregation: TimeAggregation,
): (string | number)[] {
  const { row } = group
  return [
    dimensionLabels[group.dimension],
    nameOf(group.dimension, row.id),
    row.tickets,
    formatMinutes(timeValue(aggregation, row.avgActive, row.sumActive)),
    formatMinutes(timeValue(aggregation, row.avgTotal, row.sumTotal)),
    formatMinutes(
      timeValue(aggregation, row.avgActiveExtra, row.sumActiveExtra),
    ),
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
  const { aggregation } = useTimeAggregation()
  const head = headers(aggregation)
  const rows = groups.map((group) => rowValues(group, nameOf, aggregation))

  async function handleXlsx() {
    const { exportXlsx } = await import('@/lib/excel')
    const columns = XLSX_KEYS.map((key, index) => ({
      header: head[index] ?? key,
      key,
    }))
    await exportXlsx(
      'metricas.xlsx',
      t.dimension,
      columns,
      groups.map((group) => {
        const values = rowValues(group, nameOf, aggregation)
        return Object.fromEntries(
          columns.map((column, index) => [column.key, values[index] ?? '']),
        )
      }),
    )
  }

  return (
    <ButtonGrid>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={groups.length === 0}
        onClick={() => downloadTextFile('metricas.csv', toCsv(head, rows))}
      >
        {metricsMessages.export}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={groups.length === 0}
        onClick={() => void handleXlsx()}
      >
        {metricsMessages.exportXlsx}
      </Button>
    </ButtonGrid>
  )
}
