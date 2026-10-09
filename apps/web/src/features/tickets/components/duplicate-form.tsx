import { ErrorAlert } from '@/components/shared/async-state'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/shared/form-fields'
import { toTicketError } from '../domain/errors'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { useTicketSearchByFolio } from '../hooks/use-tickets'
import { ticketMessages } from '../i18n'
import { DuplicateCandidates } from './duplicate-candidates'

/** Marcar duplicado: buscar el tiquet original por folio y enlazarlo. */
export function DuplicateForm({
  ticketId,
  onClose,
}: {
  ticketId: string
  onClose: () => void
}) {
  const actions = useTicketActions(ticketId)
  const [term, setTerm] = useState('')
  const results = useTicketSearchByFolio(term)
  const candidates = (results.data ?? []).filter(
    (ticket) => ticket.id !== ticketId,
  )

  return (
    <div className="flex flex-col gap-4">
      <TextField
        id="duplicate-search"
        label={ticketMessages.actionFields.searchFolio}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />
      <DuplicateCandidates
        candidates={candidates}
        isPending={actions.markDuplicate.isPending}
        onPick={(originalId) =>
          actions.markDuplicate.mutate({ originalId }, { onSuccess: onClose })
        }
      />
      {actions.markDuplicate.error ? (
        <ErrorAlert
          message={toTicketError(actions.markDuplicate.error).message}
        />
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className="min-h-11 self-start"
        onClick={onClose}
      >
        {ticketMessages.actionFields.cancel}
      </Button>
    </div>
  )
}
