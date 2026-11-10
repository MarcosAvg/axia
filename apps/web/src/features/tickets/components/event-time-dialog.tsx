import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TextField } from '@/components/shared/form-fields'
import { formatDateTime, toInstanceWallClockInput } from '@/lib/format'
import { toTicketError } from '../domain/errors'
import { ticketMessages } from '../i18n'
import { useAdjustEventTime } from '../hooks/use-tickets'

type AdjustableEvent = {
  id: number
  occurredAt: string
  suggestedOccurredAt?: string | null
}

function toLocal(iso: string): string {
  return toInstanceWallClockInput(iso)
}

function EventTimeActions({
  onClose,
  isPending,
}: {
  onClose: () => void
  isPending: boolean
}) {
  return (
    <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0">
      <Button
        type="button"
        variant="ghost"
        className="min-h-11"
        onClick={onClose}
      >
        {ticketMessages.actionFields.cancel}
      </Button>
      <Button type="submit" className="min-h-11" disabled={isPending}>
        {ticketMessages.eventTime.submit}
      </Button>
    </DialogFooter>
  )
}

/** Diálogo para corregir la hora de un evento del tiquet. */
export function EventTimeDialog({
  ticketId,
  item,
  onClose,
}: {
  ticketId: string
  item: AdjustableEvent
  onClose: () => void
}) {
  const [value, setValue] = useState(() =>
    toLocal(item.suggestedOccurredAt ?? item.occurredAt),
  )
  const adjust = useAdjustEventTime(ticketId)
  const messages = ticketMessages.eventTime

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!value) return
    adjust.mutate(
      { eventId: item.id, occurredLocal: value },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{messages.title}</DialogTitle>
          <DialogDescription>
            {messages.help} {formatDateTime(item.occurredAt)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <TextField
            id="event-time"
            label={messages.adjust}
            type="datetime-local"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            error={
              adjust.error ? toTicketError(adjust.error).message : undefined
            }
          />
          <EventTimeActions onClose={onClose} isPending={adjust.isPending} />
        </form>
      </DialogContent>
    </Dialog>
  )
}
