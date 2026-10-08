import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { statusTone } from '../domain/status'
import type { StatusTone } from '../domain/status'
import type { TicketStatus } from '../domain/types'
import { statusLabels } from '../i18n'

const toneClasses: Record<StatusTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  progress: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  paused: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  discarded: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
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
