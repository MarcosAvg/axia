import { BarChart3Icon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/shared/form-fields'
import { downloadTextFile } from '@/lib/download'
import { formatMinutes, formatPercent, toCsv } from '../domain/metrics'
import type { Dimension, DimensionRow } from '../domain/metrics'
import { dimensionLabels, metricsMessages } from '../i18n'

const t = metricsMessages.table
const DIMENSIONS: Dimension[] = ['team', 'building', 'category', 'dependency']
const dimensionOptions = DIMENSIONS.map((value) => ({
  value,
  label: dimensionLabels[value],
}))

function DimensionTableGrid({
  rows,
  nameOf,
}: {
  rows: DimensionRow[]
  nameOf: (id: string) => string
}) {
  if (rows.length === 0) {
    return <EmptyState icon={BarChart3Icon} title={metricsMessages.empty} />
  }
  const columns: DataTableColumn<DimensionRow>[] = [
    { id: 'dimension', header: t.dimension, cell: (row) => nameOf(row.id) },
    { id: 'tickets', header: t.tickets, cell: (row) => row.tickets },
    {
      id: 'avgActive',
      header: t.avgActive,
      cell: (row) => formatMinutes(row.avgActive),
    },
    {
      id: 'avgTotal',
      header: t.avgTotal,
      cell: (row) => formatMinutes(row.avgTotal),
    },
    {
      id: 'extra',
      header: t.extra,
      cell: (row) => formatMinutes(row.avgActiveExtra),
    },
    {
      id: 'reassignment',
      header: t.reassignment,
      cell: (row) => formatPercent(row.reassignmentRate),
    },
    {
      id: 'recapture',
      header: t.recapture,
      cell: (row) => formatPercent(row.recaptureRate),
    },
  ]
  return <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} />
}

function csvFor(rows: DimensionRow[], nameOf: (id: string) => string): string {
  return toCsv(
    [
      t.dimension,
      t.tickets,
      t.avgActive,
      t.avgTotal,
      t.extra,
      t.reassignment,
      t.recapture,
    ],
    rows.map((row) => [
      nameOf(row.id),
      row.tickets,
      formatMinutes(row.avgActive),
      formatMinutes(row.avgTotal),
      formatMinutes(row.avgActiveExtra),
      formatPercent(row.reassignmentRate),
      formatPercent(row.recaptureRate),
    ]),
  )
}

const XLSX_COLUMNS = [
  { header: t.dimension, key: 'dimension' },
  { header: t.tickets, key: 'tickets' },
  { header: t.avgActive, key: 'avgActive' },
  { header: t.avgTotal, key: 'avgTotal' },
  { header: t.extra, key: 'extra' },
  { header: t.reassignment, key: 'reassignment' },
  { header: t.recapture, key: 'recapture' },
]

function xlsxRows(
  rows: DimensionRow[],
  nameOf: (id: string) => string,
): Record<string, string | number>[] {
  return rows.map((row) => ({
    dimension: nameOf(row.id),
    tickets: row.tickets,
    avgActive: formatMinutes(row.avgActive),
    avgTotal: formatMinutes(row.avgTotal),
    extra: formatMinutes(row.avgActiveExtra),
    reassignment: formatPercent(row.reassignmentRate),
    recapture: formatPercent(row.recaptureRate),
  }))
}

function ExportButtons({
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
      xlsxRows(rows, nameOf),
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={rows.length === 0}
        onClick={() => downloadTextFile('metricas.csv', csvFor(rows, nameOf))}
      >
        {metricsMessages.export}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={rows.length === 0}
        onClick={() => void handleXlsx()}
      >
        {metricsMessages.exportXlsx}
      </Button>
    </div>
  )
}

/** Tabla por dimensión con selector y exportación a CSV/XLSX. */
export function DimensionTable({
  dimension,
  rows,
  nameOf,
  onDimensionChange,
}: {
  dimension: Dimension
  rows: DimensionRow[]
  nameOf: (id: string) => string
  onDimensionChange: (dimension: Dimension) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-56">
          <SelectField
            id="metrics-dimension"
            label={t.dimension}
            options={dimensionOptions}
            value={dimension}
            onChange={(event) =>
              onDimensionChange(event.target.value as Dimension)
            }
          />
        </div>
        <ExportButtons rows={rows} nameOf={nameOf} />
      </div>
      <DimensionTableGrid rows={rows} nameOf={nameOf} />
    </div>
  )
}
