import { cn } from 'cn'
import { toneClasses } from '@/lib/tones'
import type { Tone } from '@/lib/tones'

/** Punto de color del tono (acento de encabezados y filas). */
export function ToneDot({
  tone,
  className,
}: {
  tone: Tone
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        toneClasses[tone].dot,
        className,
      )}
    />
  )
}
