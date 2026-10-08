import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/shared/async-state'
import { TextAreaField } from '@/components/shared/form-fields'
import { toTicketError } from '../domain/errors'
import type { TicketRating } from '../domain/types'
import { ticketMessages } from '../i18n'
import { useRateTicket, useTicketRating } from '../hooks/use-ticket-rating'
import { ratingSchema } from '../schemas'

const SCORES = [1, 2, 3, 4, 5]
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

function ScorePicker({
  score,
  onSelect,
}: {
  score: number
  onSelect: (value: number) => void
}) {
  return (
    <div role="group" aria-label={t.score} className="flex flex-wrap gap-2">
      {SCORES.map((value) => (
        <Button
          key={value}
          type="button"
          variant={score === value ? 'secondary' : 'outline'}
          className="min-h-11 w-11"
          aria-pressed={score === value}
          onClick={() => onSelect(value)}
        >
          {value}
        </Button>
      ))}
    </div>
  )
}

/** Calificación de satisfacción de un tiquet cerrado. */
export function TicketRatingPanel({ ticketId }: { ticketId: string }) {
  const rating = useTicketRating(ticketId)
  const rate = useRateTicket(ticketId)
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (rating.data) return <RatingSummary rating={rating.data} />

  function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = ratingSchema.safeParse({ score, comment })
    if (!parsed.success) {
      setError(t.prompt)
      return
    }
    setError(null)
    rate.mutate({
      input: parsed.data,
      clientRequestId: crypto.randomUUID(),
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm">{t.prompt}</p>
      <ScorePicker score={score} onSelect={setScore} />
      <TextAreaField
        id="rating-comment"
        label={t.comment}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      {error ? <ErrorAlert message={error} /> : null}
      {rate.error ? (
        <ErrorAlert message={toTicketError(rate.error).message} />
      ) : null}
      {rate.isSuccess ? (
        <p className="text-sm text-muted-foreground">{t.saved}</p>
      ) : null}
      <Button
        type="submit"
        disabled={rate.isPending}
        className="min-h-11 self-start"
      >
        {rate.isPending ? t.saving : t.submit}
      </Button>
    </form>
  )
}
