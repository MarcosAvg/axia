import { ErrorAlert } from '@/components/shared/async-state'
import { useState } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatDuration } from '@/lib/format'
import { toTicketError } from '../domain/errors'
import type {
  CurrentTimeSpan,
  ManualTimeContext,
  ManualTimeSpan,
} from '../domain/types'
import {
  clockClassLabels,
  manualTimeMessages,
  timeSpanKindLabels,
} from '../i18n'
import { useManualTime, useVoidManualTime } from '../hooks/use-manual-time'
import { ManualTimeForm } from './manual-time-form'
import type { ManualTimeMode } from './manual-time-form'

function CurrentSpan({
  current,
  fallbackTechnicianName,
}: {
  current: CurrentTimeSpan
  fallbackTechnicianName: string | null
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{manualTimeMessages.current}</span>
        <span className="text-xs text-muted-foreground">
          {current.origin === 'system'
            ? manualTimeMessages.automatic
            : manualTimeMessages.manualOrigin}
        </span>
      </div>
      <span>
        {timeSpanKindLabels[current.kind]} · {manualTimeMessages.currentSince}{' '}
        {formatDateTime(current.startedAt)}
      </span>
      <span className="text-muted-foreground">
        {current.subjectTechnicianName ??
          fallbackTechnicianName ??
          manualTimeMessages.fields.noTechnician}
        {current.endedAt ? null : ` · ${manualTimeMessages.open}`}
      </span>
    </div>
  )
}

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

function TimeActions({
  canCorrect,
  onMode,
}: {
  canCorrect: boolean
  onMode: (mode: ManualTimeMode) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canCorrect ? (
        <Button
          type="button"
          className="min-h-11"
          onClick={() => onMode('correction')}
        >
          {manualTimeMessages.correct}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={() => onMode('missing')}
      >
        {manualTimeMessages.addMissing}
      </Button>
    </div>
  )
}

function ManualTimeList({
  items,
  voiding,
  onVoid,
}: {
  items: ManualTimeSpan[]
  voiding: boolean
  onVoid: (spanId: string) => void
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {manualTimeMessages.empty}
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <ManualTimeItem
          key={item.id}
          item={item}
          voiding={voiding}
          onVoid={onVoid}
        />
      ))}
    </ul>
  )
}

function ManualTimeContent({
  ticketId,
  data,
}: {
  ticketId: string
  data: {
    items: ManualTimeSpan[]
    context: ManualTimeContext
  }
}) {
  const [mode, setMode] = useState<ManualTimeMode | null>(null)
  const voidSpan = useVoidManualTime(ticketId)
  const { items, context } = data
  const current = context.current

  const onVoid = (spanId: string) =>
    voidSpan.mutate({ spanId, clientRequestId: crypto.randomUUID() })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{manualTimeMessages.help}</p>
      {current ? (
        <CurrentSpan
          current={current}
          fallbackTechnicianName={context.defaultTechnicianName}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {manualTimeMessages.noCurrent}
        </p>
      )}
      <TimeActions
        canCorrect={Boolean(current)}
        onMode={(next) => setMode(next)}
      />
      {mode ? (
        <ManualTimeForm
          ticketId={ticketId}
          mode={mode}
          context={context}
          onClose={() => setMode(null)}
        />
      ) : null}
      {voidSpan.error ? (
        <ErrorAlert message={toTicketError(voidSpan.error).message} />
      ) : null}
      <ManualTimeList
        items={items}
        voiding={voidSpan.isPending}
        onVoid={onVoid}
      />
    </div>
  )
}

/** Tiempos manuales del tiquet: detecta el tramo abierto y permite corregirlo. */
export function ManualTimePanel({ ticketId }: { ticketId: string }) {
  const page = useManualTime(ticketId)
  if (page.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{manualTimeMessages.help}</p>
    )
  }
  if (page.isError || !page.data) {
    return <ErrorAlert message={toTicketError(page.error).message} />
  }
  return <ManualTimeContent ticketId={ticketId} data={page.data} />
}
