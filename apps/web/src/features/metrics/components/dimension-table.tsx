import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/shared/form-fields'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
    return (
      <p className="py-3 text-sm text-muted-foreground">
        {metricsMessages.empty}
      </p>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.dimension}</TableHead>
          <TableHead>{t.tickets}</TableHead>
          <TableHead>{t.avgActive}</TableHead>
          <TableHead>{t.avgTotal}</TableHead>
          <TableHead>{t.extra}</TableHead>
          <TableHead>{t.reassignment}</TableHead>
          <TableHead>{t.recapture}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{nameOf(row.id)}</TableCell>
            <TableCell>{row.tickets}</TableCell>
            <TableCell>{formatMinutes(row.avgActive)}</TableCell>
            <TableCell>{formatMinutes(row.avgTotal)}</TableCell>
            <TableCell>{formatMinutes(row.avgActiveExtra)}</TableCell>
            <TableCell>{formatPercent(row.reassignmentRate)}</TableCell>
            <TableCell>{formatPercent(row.recaptureRate)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
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

/** Tabla por dimensión con selector y exportación a CSV. */
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
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={rows.length === 0}
          onClick={() => downloadTextFile('metricas.csv', csvFor(rows, nameOf))}
        >
          {metricsMessages.export}
        </Button>
      </div>
      <DimensionTableGrid rows={rows} nameOf={nameOf} />
    </div>
  )
}
