import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'

import {
  action,
  addEvidence,
  createTicket,
  takeAndAssign,
} from './tickets-lifecycle-helpers.js'
import type { TicketHttpContext } from './tickets-http-helpers.js'
import type { WriteRefs } from './tickets-write-helpers.js'

export function pauseAction(
  context: TicketHttpContext,
  cookie: string,
  ticketId: string,
  payload: Record<string, unknown>,
) {
  return action(context, cookie, ticketId, payload)
}

export async function startedTicketForPause(
  context: TicketHttpContext,
  refs: WriteRefs,
): Promise<string> {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  await addEvidence(context, refs, ticketId, 'before')
  const started = await action(context, context.cookies.technician, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  if (started.statusCode !== 200) {
    throw new Error(`Start failed: ${started.statusCode}`)
  }
  return ticketId
}

export async function insertPauseReason(
  context: TicketHttpContext,
  input: {
    name: string
    parentId?: string
    kind?: 'progress' | 'exit'
  },
): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.reasons (use, name, parent_id, pause_step_kind)
    values (
      'pause', ${input.name}, ${input.parentId ?? null},
      ${input.kind ?? null}::public.pause_step_kind
    )
    returning id
  `)
  return (result.rows[0] as { id: string }).id
}

export async function insertPauseEdge(
  context: TicketHttpContext,
  from: string,
  to: string,
) {
  await context.db.execute(sql`
    insert into public.pause_transitions (from_reason_id, to_reason_id)
    values (${from}, ${to})
  `)
}

export async function pauseCurrentTicket(
  context: TicketHttpContext,
  ticketId: string,
  reasonId: string,
) {
  return action(context, context.cookies.supervisor, ticketId, {
    action: 'pause',
    reasonId,
    clientRequestId: randomUUID(),
  })
}
