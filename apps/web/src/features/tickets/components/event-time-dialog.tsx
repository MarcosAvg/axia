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
import { formatDateTime } from '@/lib/format'
import { toTicketError } from '../domain/errors'
import type { TicketTimelineItem } from '../domain/types'
import { ticketMessages } from '../i18n'
import { useAdjustEventTime } from '../hooks/use-tickets'

function toLocal(iso: string): string {
  const date = new Date(iso)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
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
  item: TicketTimelineItem
  onClose: () => void
}) {
  const [value, setValue] = useState(() => toLocal(item.occurredAt))
  const adjust = useAdjustEventTime(ticketId)
  const messages = ticketMessages.eventTime

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!value) return
    adjust.mutate(
      { eventId: item.id, occurredAt: new Date(value).toISOString() },
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
