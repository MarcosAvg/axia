import { useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorAlert } from '@/components/shared/async-state'
import { TextAreaField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useMediaQuery } from '@/lib/use-media-query'
import { toTicketError } from '../domain/errors'
import { ticketMessages } from '../i18n'
import { useRateTicket, useTicketRating } from '../hooks/use-ticket-rating'
import { ratingSchema } from '../schemas'

const SCORES = [1, 2, 3, 4, 5]
const t = ticketMessages.rating

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

function RatingForm({
  ticketId,
  onClose,
}: {
  ticketId: string
  onClose: () => void
}) {
  const rate = useRateTicket(ticketId)
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = ratingSchema.safeParse({ score, comment })
    if (!parsed.success) {
      setError(t.prompt)
      return
    }
    setError(null)
    rate.mutate(
      { input: parsed.data, clientRequestId: crypto.randomUUID() },
      { onSuccess: onClose },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
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
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={onClose}
        >
          {t.later}
        </Button>
        <Button type="submit" disabled={rate.isPending} className="min-h-11">
          {rate.isPending ? t.saving : t.submit}
        </Button>
      </div>
    </form>
  )
}

function RatingContent({
  ticketId,
  onClose,
}: {
  ticketId: string
  onClose: () => void
}) {
  const rating = useTicketRating(ticketId)

  if (rating.data) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p className="font-medium">{t.saved}</p>
        <p>
          {t.score}: {rating.data.score} / 5
        </p>
        {rating.data.comment ? (
          <p className="text-muted-foreground">{rating.data.comment}</p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="min-h-11 self-start"
          onClick={onClose}
        >
          {t.close}
        </Button>
      </div>
    )
  }

  return <RatingForm ticketId={ticketId} onClose={onClose} />
}

/** Calificación de satisfacción en modal (hoja inferior en móvil). */
export function TicketRatingDialog({
  ticketId,
  open,
  onOpenChange,
}: {
  ticketId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const close = () => onOpenChange(false)
  const body = <RatingContent ticketId={ticketId} onClose={close} />

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.title}</DialogTitle>
            <DialogDescription>{t.prompt}</DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-xl p-4 pb-6"
      >
        <SheetHeader className="p-0 pr-8">
          <SheetTitle>{t.title}</SheetTitle>
          <SheetDescription>{t.prompt}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}
