import { sql } from 'drizzle-orm'

import type { TicketHttpContext } from './tickets-http-helpers.js'

export async function lastEventId(
  context: TicketHttpContext,
  ticketId: string,
  type: string,
): Promise<string> {
  const result = await context.db.execute(sql`
    select id from public.ticket_events
    where ticket_id = ${ticketId} and type = ${type}
    order by occurred_at desc, id desc
    limit 1
  `)
  return String((result.rows[0] as { id: string | number }).id)
}

export async function reasonId(
  context: TicketHttpContext,
  use: string,
): Promise<string> {
  const result = await context.db.execute(sql`
    select id from public.reasons
    where use = ${use}::public.reason_use and parent_id is null
    order by name
    limit 1
  `)
  return (result.rows[0] as { id: string }).id
}

export async function childReasonId(
  context: TicketHttpContext,
  parentId: string,
): Promise<string> {
  const result = await context.db.execute(sql`
    select id from public.reasons
    where parent_id = ${parentId}
    order by name
    limit 1
  `)
  return (result.rows[0] as { id: string }).id
}
