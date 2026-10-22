import type { TicketDetail } from '../domain/types'
import { TicketStatusRibbon } from './ticket-status-ribbon'

/** Encabezado del detalle: folio, prioridad, descripción y avance del flujo. */
export function TicketHeader({ ticket }: { ticket: TicketDetail }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {ticket.folio}
        </h1>
        {ticket.priorityName ? (
          <span className="text-sm text-muted-foreground">
            {ticket.priorityName}
          </span>
        ) : null}
      </div>
      <p className="max-w-3xl text-sm">{ticket.description}</p>
      <TicketStatusRibbon status={ticket.status} />
    </div>
  )
}
