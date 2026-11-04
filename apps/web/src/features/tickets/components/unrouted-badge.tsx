import { AlertTriangleIcon } from 'lucide-react'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { eventLabels } from '../i18n'

/** Marca de un tiquet registrado que quedó sin supervisores candidatos (RN-03). */
export function UnroutedBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 border-destructive/50 bg-destructive/10 text-destructive',
        className,
      )}
    >
      <AlertTriangleIcon className="size-3" aria-hidden />
      {eventLabels.unrouted}
    </Badge>
  )
}
