import { Link } from '@tanstack/react-router'
import { ImagesIcon } from 'lucide-react'
import type { MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/lib/use-media-query'
import type { TicketDetail, TicketPauseState } from '../domain/types'
import { ticketMessages } from '../i18n'
import { CurrentPause } from './pause-panel'
import { PendingSyncBadge } from './pending-sync-badge'
import { PossibleDuplicateBadge } from './possible-duplicate-badge'
import { StatusBadge } from './status-badge'
import { EVIDENCE_SECTION_ID } from './ticket-detail-sections'
import { UnroutedBadge } from './unrouted-badge'

function focusEvidence(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  document.getElementById(EVIDENCE_SECTION_ID)?.focus({ preventScroll: true })
}

/** Encabezado del detalle: folio, estado, prioridad y descripción. */
export function TicketHeader({
  ticket,
  pendingSync = false,
  pause,
}: {
  ticket: TicketDetail
  pendingSync?: boolean
  pause: TicketPauseState | null
}) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {ticket.folio}
        </h1>
        <StatusBadge status={ticket.status} />
        {pendingSync ? <PendingSyncBadge /> : null}
        {ticket.possibleDuplicate ? <PossibleDuplicateBadge /> : null}
        {ticket.isUnrouted ? <UnroutedBadge /> : null}
        {ticket.priorityName ? (
          <span className="text-sm text-muted-foreground">
            {ticket.priorityName}
          </span>
        ) : null}
      </div>
      {!isDesktop && pause ? (
        <div className="mt-1 rounded-lg border bg-card p-3 lg:hidden">
          <CurrentPause current={pause} />
        </div>
      ) : null}
      <Button asChild variant="outline" className="mt-1 min-h-11 lg:hidden">
        <Link
          to="/tickets/$ticketId"
          params={{ ticketId: ticket.id }}
          hash={EVIDENCE_SECTION_ID}
          replace
          onClick={focusEvidence}
        >
          <ImagesIcon aria-hidden />
          {ticketMessages.detail.evidence}
        </Link>
      </Button>
      <p className="max-w-3xl text-sm wrap-anywhere">{ticket.description}</p>
    </div>
  )
}
