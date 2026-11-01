import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/shared/form-fields'
import { ErrorAlert } from '@/components/shared/async-state'
import { toTicketError } from '../domain/errors'
import type { DuplicateCandidate } from '../domain/types'
import {
  useDuplicateAlerts,
  useTicketSearchByFolio,
} from '../hooks/use-tickets'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { statusLabels, ticketMessages } from '../i18n'
import { DuplicateCandidateDetails } from './duplicate-candidate-details'
import { DuplicateCandidates } from './duplicate-candidates'

function DetectedCandidate({
  candidate,
  disabled,
  onPick,
}: {
  candidate: DuplicateCandidate
  disabled: boolean
  onPick: () => void
}) {
  return (
    <li className="rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{candidate.folio ?? '—'}</span>
        {candidate.status ? (
          <span className="text-muted-foreground">
            {statusLabels[candidate.status]}
          </span>
        ) : null}
      </div>
      <DuplicateCandidateDetails candidate={candidate} />
      <Button
        type="button"
        variant="outline"
        className="mt-2 min-h-11"
        disabled={disabled}
        onClick={onPick}
      >
        {ticketMessages.detail.markThisDuplicate}
      </Button>
    </li>
  )
}

function DetectedCandidates({
  candidates,
  isLoading,
  disabled,
  onPick,
}: {
  candidates: DuplicateCandidate[]
  isLoading: boolean
  disabled: boolean
  onPick: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">
        {ticketMessages.actionFields.detectedCandidates}
      </span>
      {candidates.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {candidates.map((candidate) => (
            <DetectedCandidate
              key={candidate.id}
              candidate={candidate}
              disabled={disabled}
              onPick={() => onPick(candidate.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? ticketMessages.actionFields.loadingCandidates
            : ticketMessages.actionFields.noDetectedCandidates}
        </p>
      )}
    </div>
  )
}

function FolioSearch({
  ticketId,
  disabled,
  onPick,
}: {
  ticketId: string
  disabled: boolean
  onPick: (id: string) => void
}) {
  const [term, setTerm] = useState('')
  const results = useTicketSearchByFolio(term)
  const candidates = (results.data ?? []).filter(
    (ticket) => ticket.id !== ticketId,
  )
  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <TextField
        id="duplicate-search"
        label={ticketMessages.actionFields.searchFolio}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        {ticketMessages.actionFields.searchHelp}
      </p>
      <DuplicateCandidates
        candidates={candidates}
        isPending={disabled}
        onPick={onPick}
      />
    </div>
  )
}

/** Marcar duplicado: candidatos detectados y búsqueda del original por folio. */
export function DuplicateForm({
  ticketId,
  onClose,
}: {
  ticketId: string
  onClose: () => void
}) {
  const actions = useTicketActions(ticketId)
  const alerts = useDuplicateAlerts(ticketId)
  const detected = (alerts.data ?? []).filter(
    (candidate) =>
      candidate.decision !== 'linked' && candidate.decision !== 'dismissed',
  )

  function pick(originalId: string) {
    actions.markDuplicate.mutate({ originalId }, { onSuccess: onClose })
  }

  return (
    <div className="flex flex-col gap-5">
      <DetectedCandidates
        candidates={detected}
        isLoading={alerts.isLoading}
        disabled={actions.markDuplicate.isPending}
        onPick={pick}
      />
      <FolioSearch
        ticketId={ticketId}
        disabled={actions.markDuplicate.isPending}
        onPick={pick}
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
