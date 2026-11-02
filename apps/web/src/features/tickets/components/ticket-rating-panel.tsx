import { Button } from '@/components/ui/button'
import type { TicketRating } from '../domain/types'
import { ticketMessages } from '../i18n'
import { useTicketRating } from '../hooks/use-ticket-rating'

const t = ticketMessages.rating

function RatingSummary({ rating }: { rating: TicketRating }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p className="font-medium">{t.current}</p>
      <p>
        {t.score}: {rating.score} / 5
      </p>
      {rating.comment ? (
        <p className="text-muted-foreground">{rating.comment}</p>
      ) : null}
    </div>
  )
}

/** Resumen de la calificación o acceso al modal para calificar. */
export function TicketRatingPanel({
  ticketId,
  onOpen,
}: {
  ticketId: string
  onOpen: () => void
}) {
  const rating = useTicketRating(ticketId)

  if (rating.data) return <RatingSummary rating={rating.data} />

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t.prompt}</p>
      <Button type="button" className="min-h-11 self-start" onClick={onOpen}>
        {t.open}
      </Button>
    </div>
  )
}
