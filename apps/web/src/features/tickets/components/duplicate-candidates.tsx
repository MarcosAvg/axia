import { Button } from '@/components/ui/button'
import type { TicketListItem } from '../domain/types'
import { ticketMessages } from '../i18n'

interface DuplicateCandidatesProps {
  candidates: TicketListItem[]
  isPending: boolean
  onPick: (ticketId: string) => void
}

/** Resultados de la búsqueda del tiquet original. */
export function DuplicateCandidates({
  candidates,
  isPending,
  onPick,
}: DuplicateCandidatesProps) {
  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
      {candidates.map((ticket) => (
        <li
          key={ticket.id}
          className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
        >
          <span>
            {ticket.folio} · {ticket.description}
          </span>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isPending}
            onClick={() => onPick(ticket.id)}
          >
            {ticketMessages.actions.mark_duplicate}
          </Button>
        </li>
      ))}
    </ul>
  )
}
