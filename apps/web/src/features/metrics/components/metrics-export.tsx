import { ChevronDownIcon, DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTimeMeasure } from '@/components/shared/time-measure-context'
import { downloadTextFile } from '@/lib/download'
import { isRobustMeasure, type TimeMeasure } from '@/lib/time-measure'
import type { DimensionGroup } from '../domain/dimensions'
import { formatMinutes, formatPercent, toCsv } from '../domain/metrics'
import { measureSample, measureValue, type TimeMode } from '../domain/time-mode'
import { dimensionLabels, dimensionValueLabel, metricsMessages } from '../i18n'

const t = metricsMessages.table

interface ExportColumn {
  key: string
  header: string
  value: (group: DimensionGroup) => string | number
}

function labelOf(label: string, measure: TimeMeasure): string {
  if (measure === 'average') return label
  return `${label} (${metricsMessages.measure.tags[measure]})`
}

function timeValue(
  group: DimensionGroup,
  key: 'active' | 'total',
  measure: TimeMeasure,
  mode: TimeMode,
): string {
  return formatMinutes(
    measureValue(
      group.row as unknown as Record<string, number>,
      key,
      mode,
      measure,
    ),
  )
}

function baseColumns(): ExportColumn[] {
  return [
    {
      key: 'dimension',
      header: t.dimension,
      value: (group) => dimensionLabels[group.dimension],
    },
    {
      key: 'name',
      header: t.name,
      value: (group) =>
        dimensionValueLabel(group.dimension, group.row.id, group.row.name),
    },
    {
      key: 'tickets',
      header: t.tickets,
      value: (group) => group.row.tickets,
    },
  ]
}

function sampleColumn(measure: TimeMeasure, mode: TimeMode): ExportColumn {
  return {
    key: 'sample',
    header: metricsMessages.times.sample,
    value: (group) =>
      measureSample(
        group.row as unknown as Record<string, number>,
        'total',
        measure,
        mode,
      ) ?? 0,
  }
}

function activeTotalColumns(
  measure: TimeMeasure,
  mode: TimeMode,
): ExportColumn[] {
  return [
    {
      key: 'active',
      header: labelOf(t.avgActive, measure),
      value: (group) => timeValue(group, 'active', measure, mode),
    },
    {
      key: 'total',
      header: labelOf(t.avgTotal, measure),
      value: (group) => timeValue(group, 'total', measure, mode),
    },
  ]
}

function extraColumn(measure: TimeMeasure): ExportColumn {
  return {
    key: 'extra',
    header: t.extra,
    value: (group) =>
      formatMinutes(
        measureValue(
          group.row as unknown as Record<string, number>,
          'active',
          'extra',
          measure,
        ),
      ),
  }
}

function rateColumns(): ExportColumn[] {
  return [
    {
      key: 'reassignment',
      header: t.reassignment,
      value: (group) => formatPercent(group.row.reassignmentRate),
    },
    {
      key: 'recapture',
      header: t.recapture,
      value: (group) => formatPercent(group.row.recaptureRate),
    },
  ]
}

function exportColumns(measure: TimeMeasure, mode: TimeMode): ExportColumn[] {
  const columns = baseColumns()
  if (isRobustMeasure(measure)) columns.push(sampleColumn(measure, mode))
  columns.push(...activeTotalColumns(measure, mode))
  if (!isRobustMeasure(measure)) columns.push(extraColumn(measure))
  columns.push(...rateColumns())
  return columns
}

/** Exportación de todas las agrupaciones por dimensión (CSV y XLSX). */
export function MetricsExport({
  groups,
  mode,
}: {
  groups: DimensionGroup[]
  mode: TimeMode
}) {
  const { measure } = useTimeMeasure()
  const columns = exportColumns(measure, mode)
  const head = columns.map((column) => column.header)
  const rows = groups.map((group) =>
    columns.map((column) => column.value(group)),
  )

  async function handleXlsx() {
    const { exportXlsx } = await import('@/lib/excel')
    await exportXlsx(
      'metricas.xlsx',
      t.dimension,
      columns,
      groups.map((group) =>
        Object.fromEntries(
          columns.map((column) => [column.key, column.value(group)]),
        ),
      ),
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 lg:min-h-9"
          disabled={groups.length === 0}
        >
          <DownloadIcon className="size-4" />
          {metricsMessages.export}
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onSelect={() => downloadTextFile('metricas.csv', toCsv(head, rows))}
        >
          {metricsMessages.exportCsv}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handleXlsx()}>
          {metricsMessages.exportXlsx}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
