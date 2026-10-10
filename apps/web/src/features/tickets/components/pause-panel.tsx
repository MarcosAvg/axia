import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { useTicketPauseState, useTicketPauseSteps } from '../hooks/use-tickets'
import { pauseMessages } from '../pause-i18n'

function StepLine({
  enteredAt,
  exitedAt,
  actorName,
}: {
  enteredAt: string
  exitedAt: string | null
  actorName: string | null
}) {
  const parts = [`${pauseMessages.entered}: ${formatDateTime(enteredAt)}`]
  if (exitedAt)
    parts.push(`${pauseMessages.exited}: ${formatDateTime(exitedAt)}`)
  if (actorName) parts.push(`${pauseMessages.actor}: ${actorName}`)
  return (
    <span className="text-xs text-muted-foreground">{parts.join(' · ')}</span>
  )
}

/** Pausa del tiquet: motivo, subestado actual e historial de pasos. Se oculta si no hay pausas. */
export function PausePanel({ ticketId }: { ticketId: string }) {
  const state = useTicketPauseState(ticketId)
  const steps = useTicketPauseSteps(ticketId)
  const list = steps.data ?? []
  const current = state.data

  if (!current && list.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pauseMessages.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {current ? (
            <p className="text-sm">
              <span className="text-muted-foreground">
                {pauseMessages.motive}:{' '}
              </span>
              <span className="font-medium">{current.motiveName}</span>
              <span className="text-muted-foreground">
                {' · '}
                {pauseMessages.current}:{' '}
              </span>
              <span className="font-medium">{current.currentName}</span>
            </p>
          ) : null}
          {list.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {list.map((step, index) => (
                <li
                  key={`${step.pauseId}-${index}`}
                  className="flex flex-col gap-0.5 rounded-lg border p-2 text-sm"
                >
                  <span className="font-medium">
                    {step.reasonName}
                    {step.exitedAt === null ? ` · ${pauseMessages.open}` : ''}
                  </span>
                  <StepLine
                    enteredAt={step.enteredAt}
                    exitedAt={step.exitedAt}
                    actorName={step.actorName}
                  />
                  {step.note ? (
                    <span className="text-xs text-muted-foreground">
                      {step.note}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
