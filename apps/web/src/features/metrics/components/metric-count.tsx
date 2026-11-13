import { useContext } from 'react'
import type { ReactNode } from 'react'
import { AuthContext, can } from '@/features/auth'
import type { TicketListFilters } from '@/features/tickets'
import { useMetricsDrillDown } from '../drill-down-context'
import type { DrillDownAlternate } from '../domain/drill-down'

/** Número o etiqueta que abre la lista de tiquets que lo compone. */
export function MetricCount({
  title,
  filters,
  alternate,
  children,
  disabled = false,
  className,
}: {
  title: string
  filters: TicketListFilters
  alternate?: DrillDownAlternate
  children: ReactNode
  disabled?: boolean
  className?: string
}) {
  const identity = useContext(AuthContext)?.identity ?? null
  const drillDown = useMetricsDrillDown()
  if (disabled || !drillDown || !can(identity, 'ticket.view')) {
    return <span className={className}>{children}</span>
  }
  return (
    <button
      type="button"
      onClick={() => drillDown.open({ title, filters, alternate })}
      title={title}
      aria-label={title}
      className={
        className ??
        'rounded-sm underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      }
    >
      {children}
    </button>
  )
}
