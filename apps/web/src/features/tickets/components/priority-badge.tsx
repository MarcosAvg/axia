import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { toneClasses, toneForPriority } from '@/lib/tones'

/** Insignia de prioridad con el color del nivel (Urgente/Alta/Media/Baja). */
export function PriorityBadge({
  name,
  position,
}: {
  name: string | null
  position: number | null
}) {
  if (!name) return <span className="text-muted-foreground">—</span>
  const tone = toneForPriority(position)
  return (
    <Badge
      variant="secondary"
      className={cn('rounded-full', toneClasses[tone].chip)}
    >
      {name}
    </Badge>
  )
}
