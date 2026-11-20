import { Link } from '@tanstack/react-router'
import { ImagesIcon } from 'lucide-react'
import type { MouseEvent } from 'react'
import { PageHeading } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/lib/use-media-query'
import type { TicketDetail, TicketPauseState } from '../domain/types'
import { ticketMessages } from '../i18n'
import { CurrentPause } from './pause-panel'
import { PendingSyncBadge } from './pending-sync-badge'
import { PossibleDuplicateBadge } from './possible-duplicate-badge'
import { PriorityBadge } from './priority-badge'
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
    <div className="flex flex-col gap-4">
      <PageHeading
        title={ticket.folio}
        actions={
          <Button asChild variant="outline" className="min-h-11">
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
        }
      >
        <p className="max-w-3xl text-sm leading-relaxed wrap-anywhere">
          {ticket.description}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          {ticket.priorityName ? (
            <PriorityBadge
              name={ticket.priorityName}
              position={ticket.priorityPosition}
            />
          ) : null}
          {pendingSync ? <PendingSyncBadge /> : null}
          {ticket.possibleDuplicate ? <PossibleDuplicateBadge /> : null}
          {ticket.isUnrouted ? <UnroutedBadge /> : null}
        </div>
      </PageHeading>
      {!isDesktop && pause ? (
        <div className="rounded-xl border bg-card p-4 lg:hidden">
          <CurrentPause current={pause} />
        </div>
      ) : null}
    </div>
  )
}
