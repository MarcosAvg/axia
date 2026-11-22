import { CloudOffIcon, RefreshCwIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ticketMessages } from '../i18n'

/** Marca un tiquet que todavía se apoya en la cola para mostrar su estado. */
export function PendingSyncBadge({
  confirmed = false,
}: {
  confirmed?: boolean
}) {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-warning/50 bg-warning/10 text-warning-foreground dark:text-warning"
    >
      {confirmed ? <RefreshCwIcon aria-hidden /> : <CloudOffIcon aria-hidden />}
      {confirmed ? 'Actualizando vista' : ticketMessages.pending.sync}
    </Badge>
  )
}
