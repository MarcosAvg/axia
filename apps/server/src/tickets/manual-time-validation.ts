import { sql } from 'drizzle-orm'

import { AppError } from '../http/errors.js'
import type { DbExecutor } from './db.js'
import type { ManualTimeInput } from './manual-time-schema.js'

const CLOCK_TOLERANCE_MS = 60_000

export type TicketClock = {
  reported_at: Date | string
  closed_at: Date | string | null
  cycle: number
  status: string
}

type Window = { start: Date; end: Date | null }
type OverlapInput = {
  ticketId: string
  input: ManualTimeInput
  start: Date
  end: Date | null
  targetId: string | null
}

function parseWindow(input: ManualTimeInput): Window {
  return {
    start: new Date(input.startedAt),
    end: input.endedAt ? new Date(input.endedAt) : null,
  }
}

function assertChronology({ start, end }: Window): void {
  const now = new Date()
  if (start.getTime() > now.getTime() + CLOCK_TOLERANCE_MS) {
    throw new AppError(
      400,
      'validation',
      'El inicio no puede estar en el futuro',
    )
  }
  if (end && end.getTime() > now.getTime() + CLOCK_TOLERANCE_MS) {
    throw new AppError(400, 'validation', 'El fin no puede estar en el futuro')
  }
  if (end && end.getTime() < start.getTime()) {
    throw new AppError(400, 'validation', 'El fin debe ser posterior al inicio')
  }
}

async function cycleStart(
  tx: DbExecutor,
  ticketId: string,
  cycle: number,
): Promise<Date> {
  const result = await tx.execute(sql`
    select min(occurred_at) as started_at
    from public.ticket_events
    where ticket_id = ${ticketId} and cycle = ${cycle}
  `)
  return new Date(
    (result.rows[0] as { started_at: Date | string | null } | undefined)
      ?.started_at ?? new Date().toISOString(),
  )
}

async function assertWithinTicket(
  tx: DbExecutor,
  ticketId: string,
  ticket: TicketClock,
  window: Window,
): Promise<void> {
  const startOfCycle =
    ticket.cycle > 1
      ? await cycleStart(tx, ticketId, ticket.cycle)
      : new Date(ticket.reported_at)
  const latest = ticket.closed_at
    ? new Date(ticket.closed_at)
    : new Date(Date.now() + CLOCK_TOLERANCE_MS)
  if (window.start < startOfCycle) {
    throw new AppError(
      400,
      'validation',
      'El inicio no puede ser anterior al ciclo actual del tiquet',
    )
  }
  if (window.end && window.end > latest) {
    throw new AppError(
      400,
      'validation',
      'El fin no puede ser posterior al cierre del tiquet',
    )
  }
}

export async function validateWindow(
  tx: DbExecutor,
  ticketId: string,
  ticket: TicketClock,
  input: ManualTimeInput,
): Promise<Window> {
  const window = parseWindow(input)
  assertChronology(window)
  if (!window.end && !input.replacesSpanId) {
    throw new AppError(400, 'validation', 'Indica el fin del tramo')
  }
  await assertWithinTicket(tx, ticketId, ticket, window)
  return window
}

export async function assertNoOverlap(
  tx: DbExecutor,
  { ticketId, input, start, end, targetId }: OverlapInput,
): Promise<void> {
  const result = await tx.execute(sql`
    select id from public.time_spans
    where ticket_id = ${ticketId}
      and id <> ${targetId ?? '00000000-0000-0000-0000-000000000000'}::uuid
      and voided_at is null
      and kind = ${input.kind}::public.time_span_kind
      and subject_technician_id is not distinct from ${input.technicianId ?? null}::uuid
      and started_at < ${end ?? new Date().toISOString()}::timestamptz
      and coalesce(ended_at, now()) > ${start.toISOString()}::timestamptz
    limit 1
  `)
  if (result.rows[0]) {
    throw new AppError(
      409,
      'conflict',
      'El tramo se traslapa con otro tramo del mismo tipo y técnico',
    )
  }
}

export async function correctionTarget(
  tx: DbExecutor,
  ticketId: string,
  input: ManualTimeInput,
): Promise<string | null> {
  if (!input.replacesSpanId) return null
  const result = await tx.execute(sql`
    select id, kind, voided_at
    from public.time_spans
    where id = ${input.replacesSpanId} and ticket_id = ${ticketId}
    for update
  `)
  const target = result.rows[0] as
    { id: string; kind: string; voided_at: Date | string | null } | undefined
  if (!target) {
    throw new AppError(404, 'not_found', 'Tramo a corregir no encontrado')
  }
  if (target.voided_at) {
    throw new AppError(409, 'conflict', 'El tramo ya fue corregido')
  }
  if (target.kind !== input.kind) {
    throw new AppError(
      400,
      'validation',
      'El tipo debe coincidir con el tramo que se corrige',
    )
  }
  return target.id
}
