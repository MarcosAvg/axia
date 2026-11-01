import { CopyIcon } from 'lucide-react'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { ticketMessages } from '../i18n'

/** Marca visible de un tiquet que podría estar duplicado (RN-29). */
export function PossibleDuplicateBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 border-warning/50 bg-warning/10 text-warning',
        className,
      )}
    >
      <CopyIcon className="size-3" aria-hidden />
      {ticketMessages.list.duplicateMark}
    </Badge>
  )
}
