import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { statusTone } from '../domain/status'
import type { StatusTone } from '../domain/status'
import type { TicketStatus } from '../domain/types'
import { statusLabels } from '../i18n'

const toneClasses: Record<StatusTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  progress: 'bg-info/10 text-info dark:bg-info/20',
  paused:
    'bg-warning/15 text-warning-foreground dark:bg-warning/20 dark:text-warning',
  done: 'bg-success/10 text-success dark:bg-success/20',
  discarded: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
}

/** Insignia del estado del tiquet. */
export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn('rounded-full', toneClasses[statusTone(status)])}
    >
      {statusLabels[status]}
    </Badge>
  )
}
