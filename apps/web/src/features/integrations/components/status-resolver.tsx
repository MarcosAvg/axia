import { useState } from 'react'
import { toast } from 'sonner'
import { SelectField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { TICKET_STATUSES, statusLabels } from '@/features/tickets'
import type { TicketStatus } from '@/features/tickets'
import { setStatus } from '../api/import-run-api'
import { importMessages } from '../i18n'

const statusOptions = TICKET_STATUSES.map((value) => ({
  value,
  label: statusLabels[value],
}))

function StatusRow({
  system,
  externalStatus,
  onSaved,
}: {
  system: string
  externalStatus: string
  onSaved: () => void
}) {
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>('registered')

  async function save() {
    await setStatus(system, externalStatus, ticketStatus)
    toast.success(importMessages.statuses.save)
    onSaved()
  }

  return (
    <li className="flex flex-wrap items-end gap-2">
      <div className="w-48">
        <SelectField
          id={`status-${externalStatus}`}
          label={externalStatus}
          options={statusOptions}
          value={ticketStatus}
          onChange={(event) =>
            setTicketStatus(event.target.value as TicketStatus)
          }
        />
      </div>
      <Button
        type="button"
        className="min-h-11"
        onClick={() => {
          void save()
        }}
      >
        {importMessages.statuses.save}
      </Button>
    </li>
  )
}

/** Resuelve estatus de origen sin mapear. */
export function StatusResolver({
  system,
  items,
  onSaved,
}: {
  system: string
  items: string[]
  onSaved: () => void
}) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">{importMessages.statuses.title}</h4>
      <p className="text-xs text-muted-foreground">
        {importMessages.statuses.help}
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((externalStatus) => (
          <StatusRow
            key={externalStatus}
            system={system}
            externalStatus={externalStatus}
            onSaved={onSaved}
          />
        ))}
      </ul>
    </section>
  )
}
