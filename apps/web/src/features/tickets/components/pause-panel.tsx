import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import type { TicketPauseState, TicketPauseStep } from '../domain/types'
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

function CurrentPause({ current }: { current: TicketPauseState }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>
        <span className="text-muted-foreground">{pauseMessages.motive}: </span>
        <span className="font-medium">{current.motiveName}</span>
      </p>
      <p>
        <span className="text-muted-foreground">{pauseMessages.current}: </span>
        <span className="font-medium">
          {current.currentId === current.motiveId
            ? pauseMessages.noSubstate
            : current.currentName}
        </span>
      </p>
      {current.exitOptions.length > 0 ? (
        <p>
          <span className="text-muted-foreground">
            {pauseMessages.exitsAvailable}:{' '}
          </span>
          <span className="font-medium">
            {current.exitOptions.map((option) => option.name).join(', ')}
          </span>
        </p>
      ) : null}
    </div>
  )
}

function PauseSteps({ steps }: { steps: TicketPauseStep[] }) {
  const lastIndex = new Map<string, number>()
  steps.forEach((step, index) => lastIndex.set(step.pauseId, index))
  return (
    <ul className="flex flex-col gap-2">
      {steps.map((step, index) => (
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
            <span className="text-xs text-muted-foreground">{step.note}</span>
          ) : null}
          {lastIndex.get(step.pauseId) === index && step.closedReasonName ? (
            <span className="text-xs text-muted-foreground">
              {pauseMessages.closedWith}: {step.closedReasonName}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/** Pausa del tiquet: motivo, subestado actual, salidas e historial de pasos. */
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
          {current ? <CurrentPause current={current} /> : null}
          {list.length > 0 ? <PauseSteps steps={list} /> : null}
        </div>
      </CardContent>
    </Card>
  )
}
