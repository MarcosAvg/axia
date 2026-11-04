import type { TicketDetail } from '../domain/types'
import { PossibleDuplicateBadge } from './possible-duplicate-badge'
import { StatusBadge } from './status-badge'
import { UnroutedBadge } from './unrouted-badge'

/** Encabezado del detalle: folio, estado, prioridad y descripción. */
export function TicketHeader({ ticket }: { ticket: TicketDetail }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {ticket.folio}
        </h1>
        <StatusBadge status={ticket.status} />
        {ticket.possibleDuplicate ? <PossibleDuplicateBadge /> : null}
        {ticket.isUnrouted ? <UnroutedBadge /> : null}
        {ticket.priorityName ? (
          <span className="text-sm text-muted-foreground">
            {ticket.priorityName}
          </span>
        ) : null}
      </div>
      <p className="max-w-3xl text-sm">{ticket.description}</p>
    </div>
  )
}
