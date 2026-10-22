import { cn } from 'cn'
import { stageIndex, statusStage, TICKET_STAGES } from '../domain/status'
import type { TicketStatus } from '../domain/types'
import { stageLabels, statusRibbonMessages as messages } from '../status-i18n'
import { StatusBadge } from './status-badge'

function RibbonHeader({
  status,
  currentIndex,
  discarded,
}: {
  status: TicketStatus
  currentIndex: number
  discarded: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        {status === 'paused' ? (
          <span className="text-xs font-medium text-warning-foreground dark:text-warning">
            {messages.paused}
          </span>
        ) : null}
      </div>
      <span className="text-xs text-muted-foreground">
        {discarded
          ? messages.discarded
          : messages.step(currentIndex + 1, TICKET_STAGES.length)}
      </span>
    </div>
  )
}

function RibbonSteps({
  status,
  currentIndex,
}: {
  status: TicketStatus
  currentIndex: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <ol className="flex gap-1">
        {TICKET_STAGES.map((item, index) => {
          const reached = index <= currentIndex
          const current = index === currentIndex
          return (
            <li
              key={item}
              aria-label={stageLabels[item]}
              aria-current={current ? 'step' : undefined}
              className="flex min-w-0 flex-1 flex-col gap-1"
            >
              <span
                aria-hidden
                className={cn(
                  'h-1.5 rounded-full',
                  reached
                    ? current
                      ? status === 'paused'
                        ? 'bg-warning'
                        : 'bg-primary'
                      : 'bg-primary/50'
                    : 'bg-border',
                )}
              />
              <span
                aria-hidden
                className={cn(
                  'hidden text-center text-[11px] leading-tight sm:block',
                  current
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {stageLabels[item]}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="text-xs text-muted-foreground sm:hidden">
        {messages.current(
          stageLabels[TICKET_STAGES[currentIndex] ?? 'registered'],
        )}
      </p>
    </div>
  )
}

function RibbonDiscarded() {
  return (
    <div className="flex flex-col gap-1">
      <span aria-hidden className="h-1.5 rounded-full bg-destructive/30" />
      <p className="text-xs text-muted-foreground">{messages.discardedHelp}</p>
    </div>
  )
}

/** Franja del flujo normal, con el estado actual y el detalle de pausa o descarte. */
export function TicketStatusRibbon({ status }: { status: TicketStatus }) {
  const stage = statusStage(status)
  const currentIndex = stage === null ? -1 : stageIndex(stage)

  return (
    <section
      aria-label={messages.aria}
      className="flex flex-col gap-2 rounded-xl border bg-muted/25 p-3 sm:p-4"
    >
      <RibbonHeader
        status={status}
        currentIndex={currentIndex}
        discarded={stage === null}
      />
      {stage === null ? (
        <RibbonDiscarded />
      ) : (
        <RibbonSteps status={status} currentIndex={currentIndex} />
      )}
    </section>
  )
}
