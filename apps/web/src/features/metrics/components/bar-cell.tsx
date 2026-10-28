import type { ReactNode } from 'react'
import { cn } from 'cn'
import { shareOf } from '../domain/visuals'

/** Barra proporcional con su valor, para usar dentro de una tabla. */
export function BarCell({
  value,
  max,
  label,
  className,
}: {
  value: number
  max: number
  label: ReactNode
  className?: string
}) {
  const percent = Math.round(shareOf(value, max) * 100)
  return (
    <span className={cn('flex min-w-36 items-center gap-2', className)}>
      <span
        className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-muted"
        aria-hidden
      >
        <span
          className="block h-full rounded-full bg-chart-1"
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="shrink-0 tabular-nums">{label}</span>
    </span>
  )
}

/** Barra apilada de dos o más segmentos, con su total opcional. */
export function StackedBarCell({
  segments,
  label,
  className,
}: {
  segments: { key: string; value: number; color: string }[]
  label?: ReactNode
  className?: string
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  return (
    <span className={cn('flex min-w-36 items-center gap-2', className)}>
      <span
        className="flex h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-muted"
        aria-hidden
      >
        {segments.map((segment) => (
          <span
            key={segment.key}
            className="h-full"
            style={{
              width: `${shareOf(segment.value, total) * 100}%`,
              background: segment.color,
            }}
          />
        ))}
      </span>
      {label ? <span className="shrink-0 tabular-nums">{label}</span> : null}
    </span>
  )
}
