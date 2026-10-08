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
    return (
      <p className="py-3 text-sm text-muted-foreground">
        {metricsMessages.empty}
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">{t.dimension}</th>
            <th className="py-2 pr-3 font-medium">{t.tickets}</th>
            <th className="py-2 pr-3 font-medium">{t.avgActive}</th>
            <th className="py-2 pr-3 font-medium">{t.avgTotal}</th>
            <th className="py-2 pr-3 font-medium">{t.extra}</th>
            <th className="py-2 pr-3 font-medium">{t.reassignment}</th>
            <th className="py-2 pr-3 font-medium">{t.recapture}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="py-2 pr-3">{nameOf(row.id)}</td>
              <td className="py-2 pr-3">{row.tickets}</td>
              <td className="py-2 pr-3">{formatMinutes(row.avgActive)}</td>
              <td className="py-2 pr-3">{formatMinutes(row.avgTotal)}</td>
              <td className="py-2 pr-3">{formatMinutes(row.avgActiveExtra)}</td>
              <td className="py-2 pr-3">
                {formatPercent(row.reassignmentRate)}
              </td>
              <td className="py-2 pr-3">{formatPercent(row.recaptureRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
