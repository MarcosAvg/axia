import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { averageOf, formatMinutes, formatPercent } from '../domain/metrics'
import type {
  DuplicateAlert,
  DuplicateDimensionRow,
  DuplicateTicket,
} from '../domain/metrics'
import { dimensionLabels, metricsMessages } from '../i18n'
import { MetricCard } from './metric-card'

const t = metricsMessages.duplicates

function decisionLabel(decision: string): string {
  const labels = t.decisions as Record<string, string>
  return labels[decision] ?? decision
}

function dimensionName(row: DuplicateDimensionRow): string {
  const type = dimensionLabels[row.dimension as keyof typeof dimensionLabels]
  const name = row.dimensionName ?? row.dimensionId
  return type ? `${type}: ${name}` : name
}

/** Indicadores de duplicados: tiempo hasta marcarse, alertas y tasa por dimensión. */
export function DuplicatesSection({
  tickets,
  alerts,
  rows,
}: {
  tickets: DuplicateTicket[]
  alerts: DuplicateAlert[]
  rows: DuplicateDimensionRow[]
}) {
  const avg = averageOf(tickets.map((item) => item.timeToMarkMinutes))
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t.timeToMark} value={formatMinutes(avg)} />
        {alerts.map((alert) => (
          <MetricCard
            key={alert.decision}
            label={decisionLabel(alert.decision)}
            value={String(alert.candidates)}
          />
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.dimension}</TableHead>
            <TableHead>{t.tickets}</TableHead>
            <TableHead>{t.duplicates}</TableHead>
            <TableHead>{t.rate}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.dimension}-${row.dimensionId}`}>
              <TableCell>{dimensionName(row)}</TableCell>
              <TableCell>{row.tickets}</TableCell>
              <TableCell>{row.duplicates}</TableCell>
              <TableCell>{formatPercent(row.duplicateRate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
