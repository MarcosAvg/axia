import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatRate } from '../domain/metrics'
import type { SlaPriorityRow } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const t = metricsMessages.sla

/** Cumplimiento de tiempos objetivo por prioridad. */
export function SlaSection({ rows }: { rows: SlaPriorityRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.empty}</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.priority}</TableHead>
          <TableHead>{t.withTarget}</TableHead>
          <TableHead>{t.met}</TableHead>
          <TableHead>{t.rate}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.priorityId}>
            <TableCell>{row.priorityName}</TableCell>
            <TableCell>{row.withTarget}</TableCell>
            <TableCell>{row.met}</TableCell>
            <TableCell>{formatRate(row.complianceRate)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
