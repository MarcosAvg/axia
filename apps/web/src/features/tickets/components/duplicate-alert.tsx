import { Button } from '@/components/ui/button'
import { ButtonGrid } from '@/components/shared/button-grid'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import type { DuplicateCandidate } from '../domain/types'
import { statusLabels, ticketMessages } from '../i18n'

interface DuplicateAlertProps {
  candidates: DuplicateCandidate[]
  onConfirm: () => void
  onCancel: () => void
  isSubmitting: boolean
}

function CandidateItem({ candidate }: { candidate: DuplicateCandidate }) {
  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{candidate.folio ?? '—'}</span>
        {candidate.status ? (
          <span className="text-muted-foreground">
            {statusLabels[candidate.status]}
          </span>
        ) : null}
      </div>
      {candidate.building ? <p>{candidate.building}</p> : null}
      {candidate.problem ? <p>{candidate.problem}</p> : null}
      {candidate.requester_contact ? (
        <p>{candidate.requester_contact}</p>
      ) : null}
      {candidate.reported_at ? (
        <p className="text-xs text-muted-foreground">
          {formatDateTime(candidate.reported_at)}
        </p>
      ) : null}
    </li>
  )
}

/** Aviso de posibles duplicados (no bloquea el registro, RN-29). */
export function DuplicateAlert({
  candidates,
  onConfirm,
  onCancel,
  isSubmitting,
}: DuplicateAlertProps) {
  const { create } = ticketMessages

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader>
        <CardTitle>{create.duplicateTitle}</CardTitle>
        <CardDescription>{create.duplicateHelp}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2 text-sm">
          {candidates.map((candidate, index) => (
            <CandidateItem
              key={candidate.folio ?? index}
              candidate={candidate}
            />
          ))}
        </ul>
        <ButtonGrid>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="min-h-11"
          >
            {create.duplicateConfirm}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="min-h-11"
          >
            {create.duplicateCancel}
          </Button>
        </ButtonGrid>
      </CardContent>
    </Card>
  )
}
