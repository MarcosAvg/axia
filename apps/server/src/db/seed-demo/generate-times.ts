import type {
  DemoPauseSpec,
  DemoTicketStatus,
  DemoTicketTimes,
} from './data.js'
import {
  OLD_STATUSES,
  OPEN_AGING_DAYS,
  PAUSE_TRIPLES,
  RATING_SEQUENCE,
} from './generate-catalog.js'
import { between, integer, weighted, type Rng } from './random.js'

type ReportedInput = {
  rnd: Rng
  now: Date
  status: DemoTicketStatus
  oldIndex: number
  staleIndex: number
}

function monthDate(
  rnd: Rng,
  now: Date,
  monthsAgo: number,
  time: { day: number; hour: number },
) {
  return new Date(
    now.getFullYear(),
    now.getMonth() - monthsAgo,
    time.day,
    time.hour,
    integer(rnd, 0, 59),
    0,
    0,
  )
}

export function reportedHoursAgo(input: ReportedInput) {
  const { rnd, now, status, oldIndex, staleIndex } = input
  if (OLD_STATUSES.includes(status)) {
    const date = monthDate(rnd, now, 1 + (oldIndex % 11), {
      day: integer(rnd, 3, 24),
      hour: integer(rnd, 8, 17),
    })
    return Math.max(2, (now.getTime() - date.getTime()) / 3_600_000)
  }
  if (
    staleIndex < OPEN_AGING_DAYS.length &&
    ['registered', 'with_supervisor', 'assigned'].includes(status)
  ) {
    return (OPEN_AGING_DAYS[staleIndex] as number) * 24
  }
  if (status === 'registered') return between(rnd, 0.5, 2.5)
  if (status === 'paused') return between(rnd, 1, 9) * 24
  if (status === 'under_claim') return between(rnd, 1, 18) * 24
  return between(rnd, 1, 13) * 24
}

function priorityTargetHours(priority: string) {
  if (priority === 'Urgente') return 1
  if (priority === 'Alta') return 4
  if (priority === 'Media') return 24
  return 72
}

export function baselineTimes(
  rnd: Rng,
  priority: string,
  status: DemoTicketStatus,
): DemoTicketTimes {
  const target = priorityTargetHours(priority)
  const closed = status === 'closed'
  const factor = closed
    ? rnd() < 0.18
      ? between(rnd, 1.05, 3)
      : between(rnd, 0.2, 0.92)
    : between(rnd, 0.5, 2.5)
  const desired = Math.max(0.75, target * factor)
  const taken = desired * between(rnd, 0.04, 0.12)
  const assigned = taken + desired * between(rnd, 0.04, 0.12)
  const started = assigned + desired * between(rnd, 0.08, 0.24)
  const attended = started + desired * between(rnd, 0.18, 0.38)
  const validated =
    closed && attended < desired
      ? desired
      : attended + between(rnd, closed ? 0.3 : 1, closed ? 1 : 30)
  return {
    takenAfterHours: taken,
    assignedAfterHours: assigned,
    startedAfterHours: started,
    attendedAfterHours: attended,
    validatedAfterHours: validated < attended ? attended + 0.3 : validated,
  }
}

export function discardAfter(
  rnd: Rng,
  status: DemoTicketStatus,
  from: DemoTicketStatus,
  times: DemoTicketTimes,
) {
  if (from === 'in_progress') {
    return Math.max(
      times.startedAfterHours + between(rnd, 0.5, 4),
      between(rnd, 2, 72),
    )
  }
  if (from === 'assigned') {
    return Math.max(
      times.assignedAfterHours + between(rnd, 0.3, 6),
      between(rnd, 1, 48),
    )
  }
  if (from === 'with_supervisor') {
    return Math.max(
      times.takenAfterHours + between(rnd, 0.3, 6),
      between(rnd, 0.8, 36),
    )
  }
  return status === 'duplicate' ? between(rnd, 0.5, 18) : between(rnd, 1, 60)
}

export function closedPause(rnd: Rng, times: DemoTicketTimes): DemoPauseSpec {
  const triple = weighted(
    rnd,
    PAUSE_TRIPLES.map((entry, index) => [entry, index === 0 ? 3 : 1] as const),
  )
  const opened = times.startedAfterHours + between(rnd, 0.2, 2)
  const advance = opened + between(rnd, 0.4, 3)
  return {
    openedAfterHours: opened,
    advanceAfterHours: advance,
    closedAfterHours: advance + between(rnd, 0.5, 8),
    root: triple.root,
    substate: triple.substate,
    exit: triple.exit,
  }
}

export function openPause(rnd: Rng, times: DemoTicketTimes) {
  const triple = weighted(
    rnd,
    PAUSE_TRIPLES.map((entry, index) => [entry, index === 0 ? 3 : 1] as const),
  )
  const opened = times.startedAfterHours + between(rnd, 0.2, 3)
  return {
    openedAfterHours: opened,
    advanceAfterHours: opened + between(rnd, 0.4, 3),
    root: triple.root,
    substate: triple.substate,
  }
}

export function ratingScore(rnd: Rng, ratingCount: number) {
  if (ratingCount < RATING_SEQUENCE.length) {
    return RATING_SEQUENCE[ratingCount] as number
  }
  return weighted(rnd, [
    [5, 35],
    [4, 45],
    [3, 13],
    [2, 5],
    [1, 2],
  ])
}
