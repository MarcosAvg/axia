import type { TicketListItem } from '../domain/types'

/** Identidad del tiquet en las tarjetas de bandeja y tablero. */
export function TicketCardHeading({
  folio,
  description,
}: Pick<TicketListItem, 'folio' | 'description'>) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs font-semibold text-primary tabular-nums">
        {folio}
      </span>
      <p className="line-clamp-2 text-sm font-medium wrap-anywhere">
        {description}
      </p>
    </div>
  )
}
