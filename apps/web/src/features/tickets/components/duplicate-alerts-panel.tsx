import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toTicketError } from '../domain/errors'
import type { DuplicateCandidate } from '../domain/types'
import {
  useDismissDuplicateAlerts,
  useDuplicateAlerts,
} from '../hooks/use-tickets'
import { useTicketActions } from '../hooks/use-ticket-actions'
import { statusLabels, ticketMessages } from '../i18n'
import { DuplicateCandidateDetails } from './duplicate-candidate-details'

const { detail } = ticketMessages

function AlertItem({
  candidate,
  canResolve,
  onChoose,
}: {
  candidate: DuplicateCandidate
  canResolve: boolean
  onChoose: () => void
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
      {candidate.decision === 'ignored' ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {detail.alertIgnored}
        </p>
      ) : null}
      {canResolve ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 min-h-11"
          onClick={onChoose}
        >
          {detail.markThisDuplicate}
        </Button>
      ) : null}
    </li>
  )
}

function DismissAlertsButton({ ticketId }: { ticketId: string }) {
  const dismiss = useDismissDuplicateAlerts(ticketId)
  return (
    <Button
      type="button"
      variant="ghost"
      className="min-h-11 self-start"
      disabled={dismiss.isPending}
      onClick={() =>
        dismiss.mutate(undefined, {
          onSuccess: () => toast.success(detail.alertsDismissed),
          onError: () => toast.error(detail.alertsError),
        })
      }
    >
      {detail.dismissAlerts}
    </Button>
  )
}

function MarkDuplicateDialog({
  ticketId,
  candidate,
  onClose,
}: {
  ticketId: string
  candidate: DuplicateCandidate
  onClose: () => void
}) {
  const actions = useTicketActions(ticketId)
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={detail.confirmDuplicateTitle}
      description={detail.confirmDuplicateHelp(candidate.folio ?? '—')}
      confirmLabel={ticketMessages.actions.mark_duplicate}
      destructive
      isPending={actions.markDuplicate.isPending}
      onConfirm={() => {
        actions.markDuplicate.mutate(
          { originalId: candidate.id },
          {
            onSuccess: onClose,
            onError: () =>
              toast.error(toTicketError(actions.markDuplicate.error).message),
          },
        )
      }}
    />
  )
}

/** Alertas de posible duplicado pendientes, con revisión y descarte (RN-29). */
export function DuplicateAlertsPanel({
  ticketId,
  possibleDuplicate,
  canResolve,
}: {
  ticketId: string
  possibleDuplicate: boolean
  canResolve: boolean
}) {
  const alerts = useDuplicateAlerts(ticketId)
  const [chosen, setChosen] = useState<DuplicateCandidate | null>(null)
  const items = (alerts.data ?? []).filter(
    (item) => item.decision !== 'dismissed' && item.decision !== 'linked',
  )
  const pending = items.filter((item) => !item.decision)

  if (!alerts.data) return null
  if (!possibleDuplicate && pending.length === 0) return null

  return (
    <Card className="border-warning/40">
      <CardHeader>
        <CardTitle>{detail.possibleDuplicates}</CardTitle>
        <CardDescription>{detail.possibleDuplicatesHelp}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {items.map((candidate) => (
            <AlertItem
              key={candidate.id}
              candidate={candidate}
              canResolve={canResolve}
              onChoose={() => setChosen(candidate)}
            />
          ))}
        </ul>
        {canResolve ? <DismissAlertsButton ticketId={ticketId} /> : null}
      </CardContent>
      {chosen ? (
        <MarkDuplicateDialog
          ticketId={ticketId}
          candidate={chosen}
          onClose={() => setChosen(null)}
        />
      ) : null}
    </Card>
  )
}
