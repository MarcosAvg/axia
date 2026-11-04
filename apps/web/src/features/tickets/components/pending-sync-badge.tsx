import { CloudOffIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ticketMessages } from '../i18n'

/** Marca un estado que refleja acciones aún no confirmadas por el servidor. */
export function PendingSyncBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-warning/50 bg-warning/10 text-warning-foreground dark:text-warning"
    >
      <CloudOffIcon aria-hidden />
      {ticketMessages.pending.sync}
    </Badge>
  )
}
