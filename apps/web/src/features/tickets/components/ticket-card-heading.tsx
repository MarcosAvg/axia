import type { TicketListItem } from '../domain/types'

/** Identidad del tiquet en las tarjetas de bandeja y tablero. */
export function TicketCardHeading({
  folio,
  description,
  offlineReady,
}: Pick<TicketListItem, 'folio' | 'description'> & { offlineReady?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="text-xs font-semibold text-primary tabular-nums">
          {folio}
        </span>
        {offlineReady ? (
          <span className="text-xs text-muted-foreground">
            Disponible sin conexión
          </span>
        ) : null}
      </div>
      <p className="line-clamp-2 text-sm font-medium wrap-anywhere">
        {description}
      </p>
    </div>
  )
}
