import { useState } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatDuration } from '@/lib/format'
import { toTicketError } from '../domain/errors'
import type { ManualTimeSpan } from '../domain/types'
import {
  clockClassLabels,
  manualTimeMessages,
  timeSpanKindLabels,
} from '../i18n'
import { useManualTime, useVoidManualTime } from '../hooks/use-manual-time'
import { ManualTimeForm } from './manual-time-form'

function ManualTimeItem({
  item,
  voiding,
  onVoid,
}: {
  item: ManualTimeSpan
  voiding: boolean
  onVoid: (spanId: string) => void
}) {
  const duration = formatDuration(item.startedAt, item.endedAt)
  return (
    <li
      className={cn(
        'flex flex-col gap-1 rounded-lg border p-3 text-sm',
        item.voidedAt && 'opacity-60',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="font-medium">{timeSpanKindLabels[item.kind]}</span>
        {item.voidedAt ? (
          <span className="text-xs font-medium text-destructive">
            {manualTimeMessages.voided}
          </span>
        ) : null}
      </div>
      <span className="text-muted-foreground">
        {formatDateTime(item.startedAt)}
        {duration ? ` · ${duration}` : ''} · {clockClassLabels[item.clockClass]}
      </span>
      {item.subjectTechnicianName ? (
        <span className="text-muted-foreground">
          {item.subjectTechnicianName}
        </span>
      ) : null}
      {item.voidedAt ? null : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 self-start"
          disabled={voiding}
          onClick={() => onVoid(item.id)}
        >
          {manualTimeMessages.void}
        </Button>
      )}
    </li>
  )
}

/** Tiempos manuales del tiquet: alta y anulación (supervisor/admin). */
export function ManualTimePanel({ ticketId }: { ticketId: string }) {
  const [open, setOpen] = useState(false)
  const spans = useManualTime(ticketId)
  const voidSpan = useVoidManualTime(ticketId)
  const items = spans.data ?? []

  const onVoid = (spanId: string) =>
    voidSpan.mutate({ spanId, clientRequestId: crypto.randomUUID() })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{manualTimeMessages.help}</p>
      {open ? (
        <ManualTimeForm ticketId={ticketId} onClose={() => setOpen(false)} />
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 self-start"
          onClick={() => setOpen(true)}
        >
          {manualTimeMessages.add}
        </Button>
      )}
      {voidSpan.error ? (
        <p role="alert" className="text-sm text-destructive">
          {toTicketError(voidSpan.error).message}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {manualTimeMessages.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ManualTimeItem
              key={item.id}
              item={item}
              voiding={voidSpan.isPending}
              onVoid={onVoid}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
