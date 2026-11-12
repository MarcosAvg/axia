import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  pauseAction,
  pauseCurrentTicket,
  startedTicketForPause,
} from './pause-http-helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

async function exitPath(rootId: string): Promise<string[]> {
  const result = await context.db.execute(sql`
    with recursive walk(node_id, path) as (
      select ${rootId}::uuid, array[${rootId}::uuid]::uuid[]
      union all
      select t.to_reason_id, walk.path || t.to_reason_id
      from walk
      join public.pause_transitions t on t.from_reason_id = walk.node_id
      where t.to_reason_id <> all(walk.path)
    )
    select walk.path
    from walk
    join public.reasons exit on exit.id = walk.node_id
    where exit.pause_step_kind = 'exit'
    order by array_length(walk.path, 1)
    limit 1
  `)
  return (result.rows[0] as { path: string[] } | undefined)?.path ?? []
}

it('pausa, avanza y reanuda todos los motivos preconfigurados', async () => {
  const ticketId = await startedTicketForPause(context, refs)
  const reasons = await context.db.execute(sql`
    select id, name
    from public.reasons
    where use = 'pause' and parent_id is null and active
      and name <> 'Sin salida'
    order by name
  `)
  expect(reasons.rows).toHaveLength(16)
  for (const row of reasons.rows as { id: string; name: string }[]) {
    const path = await exitPath(row.id)
    expect(path.length, row.name).toBeGreaterThan(1)
    expect(
      (await pauseCurrentTicket(context, ticketId, row.id)).statusCode,
      row.name,
    ).toBe(200)
    for (const step of path.slice(1, -1)) {
      expect(
        (
          await pauseAction(context, context.cookies.supervisor, ticketId, {
            action: 'advance_pause',
            reasonId: step,
            clientRequestId: randomUUID(),
          })
        ).statusCode,
        row.name,
      ).toBe(200)
    }
    const exit = path[path.length - 1]
    expect(
      (
        await pauseAction(context, context.cookies.supervisor, ticketId, {
          action: 'resume',
          reasonId: exit,
          clientRequestId: randomUUID(),
        })
      ).statusCode,
      row.name,
    ).toBe(200)
  }
})
