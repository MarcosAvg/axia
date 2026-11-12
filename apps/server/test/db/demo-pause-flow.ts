import { randomUUID } from 'node:crypto'

import type { Client } from 'pg'

import type { Actor } from '../../src/auth/authorization.js'
import type { Database } from '../../src/db/client.js'
import {
  advancePause,
  pauseTicket,
  resumeTicket,
} from '../../src/tickets/pause.js'

type Edge = {
  from_reason_id: string
  to_reason_id: string
  pause_step_kind: string
}

function nextByNode(
  edges: Edge[],
): Map<string, { id: string; kind: string }[]> {
  const next = new Map<string, { id: string; kind: string }[]>()
  for (const edge of edges) {
    const list = next.get(edge.from_reason_id) ?? []
    list.push({ id: edge.to_reason_id, kind: edge.pause_step_kind })
    next.set(edge.from_reason_id, list)
  }
  return next
}

function exitPath(
  rootId: string,
  next: Map<string, { id: string; kind: string }[]>,
): string[] {
  const queue: string[][] = [[rootId]]
  while (queue.length > 0) {
    const path = queue.shift()
    if (!path) break
    const current = path[path.length - 1]
    if (!current) continue
    for (const target of next.get(current) ?? []) {
      if (target.kind === 'exit') return [...path, target.id]
      if (path.includes(target.id)) continue
      queue.push([...path, target.id])
    }
  }
  throw new Error(`Demo pause root ${rootId} has no exit path`)
}

/** Recorre todos los motivos de pausa de la demo hasta una salida y reanuda. */
export async function exerciseDemoPauses(
  owner: Client,
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<void> {
  const roots = await owner.query<{ id: string; name: string }>(`
    select id, name
    from public.reasons
    where use = 'pause' and parent_id is null and active
    order by position, id
  `)
  const edges = await owner.query<Edge>(`
    select t.from_reason_id, t.to_reason_id, target.pause_step_kind
    from public.pause_transitions t
    join public.reasons target on target.id = t.to_reason_id
    where target.active
  `)
  const next = nextByNode(edges.rows)
  if (roots.rows.length !== 16) {
    throw new Error(`Expected 16 pause roots, got ${roots.rows.length}`)
  }

  for (const root of roots.rows) {
    const path = exitPath(root.id, next)
    await pauseTicket(db, actor, {
      ticketId,
      reasonId: root.id,
      note: 'Pausa de prueba demo',
      estimatedDate: null,
      clientRequestId: randomUUID(),
    })
    for (const step of path.slice(1, -1)) {
      await advancePause(db, actor, {
        ticketId,
        reasonId: step,
        note: null,
        clientRequestId: randomUUID(),
      })
    }
    const exit = path[path.length - 1]
    if (!exit) throw new Error(`Demo pause root ${root.name} has no exit`)
    await resumeTicket(db, actor, {
      ticketId,
      reasonId: exit,
      clientRequestId: randomUUID(),
    })
  }
}
