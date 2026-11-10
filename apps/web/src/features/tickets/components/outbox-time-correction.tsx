import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/shared/form-fields'
import type { OutboxItem } from '@/lib/offline/db'
import {
  processOutbox,
  retryOutboxItemWithManualTime,
} from '@/lib/offline/outbox'
import { messages } from '@/lib/i18n'

const TIME_ERROR_CODES = new Set([
  'time_out_of_order',
  'time_future',
  'time_too_old',
  'time_invalid',
])

export function isTimeError(item: OutboxItem): boolean {
  return Boolean(item.lastErrorCode && TIME_ERROR_CODES.has(item.lastErrorCode))
}

/** Corrige la hora de un envío rechazado y lo reintenta. */
export function OutboxTimeCorrection({ item }: { item: OutboxItem }) {
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const canSubmit = Boolean(value) && !pending

  async function submit() {
    if (!canSubmit) return
    setPending(true)
    try {
      await retryOutboxItemWithManualTime(item.id, value)
      await processOutbox()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed p-2">
      <p className="text-xs text-muted-foreground">
        {messages.offline.timeCorrectionHelp}
      </p>
      <TextField
        id={`outbox-time-${item.id}`}
        label={messages.offline.timeCorrectionLabel}
        type="datetime-local"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button
        type="button"
        size="sm"
        className="min-h-11 self-end"
        disabled={!canSubmit}
        onClick={() => void submit()}
      >
        {messages.offline.timeCorrection}
      </Button>
    </div>
  )
}
