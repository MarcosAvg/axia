import { cn } from 'cn'
import type { AttentionCounts } from '@/features/tickets'

/** Pendientes que corresponden a cada destino de navegación. */
export function navBadgeCount(
  id: string,
  attention: AttentionCounts | undefined,
): number {
  if (id === 'inbox') return attention?.offers ?? 0
  if (id === 'my-work') return attention?.myWork ?? 0
  return 0
}

/** Texto compacto del badge; los conteos grandes se recortan. */
export function navBadgeText(count: number): string {
  return count > 9 ? '9+' : String(count)
}

/** Etiqueta accesible con el pendiente y su número. */
export function navBadgeLabel(
  label: string,
  count: number,
  noun = 'pendiente',
): string | null {
  if (count <= 0) return null
  return count === 1 ? `${label}, 1 ${noun}` : `${label}, ${count} ${noun}s`
}

/** Insignia numérica compartida por sidebar y barra móvil. */
export function NavBadge({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  if (count <= 0) return null
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground',
        className,
      )}
    >
      {navBadgeText(count)}
    </span>
  )
}
