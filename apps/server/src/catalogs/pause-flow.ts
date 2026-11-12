import { sql } from 'drizzle-orm'
import { z } from 'zod'

import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'

const edgeSchema = z.object({
  from: z.string().uuid(),
  to: z.string().uuid(),
})

const flowBodySchema = z.object({
  edges: z.array(edgeSchema).max(2000),
})

type FlowNode = {
  id: string
  parentId: string | null
  name: string
  kind: 'progress' | 'exit' | null
  active: boolean
}

type FlowEdge = { from: string; to: string }

export type PauseFlow = {
  rootId: string
  rootName: string
  nodes: FlowNode[]
  edges: FlowEdge[]
}

type NodeRow = {
  root_id: string
  id: string
  parent_id: string | null
  name: string
  pause_step_kind: 'progress' | 'exit' | null
  active: boolean
}

function invalid(message: string): AppError {
  return new AppError(400, 'validation_error', message)
}

function conflict(message: string): AppError {
  return new AppError(409, 'conflict', message)
}

async function loadNodes(db: Pick<Database, 'execute'>): Promise<NodeRow[]> {
  const result = await db.execute(sql`
    with recursive tree(root_id, id, parent_id, name, pause_step_kind, active) as (
      select root.id, root.id, root.parent_id, root.name,
        root.pause_step_kind, root.active
      from public.reasons root
      where root.use = 'pause' and root.parent_id is null
      union all
      select tree.root_id, child.id, child.parent_id, child.name,
        child.pause_step_kind, child.active
      from tree
      join public.reasons child on child.parent_id = tree.id
      where child.use = 'pause'
    )
    select * from tree
  `)
  return result.rows as NodeRow[]
}

/** Flujo completo por motivo: nodos y aristas para el editor de administración. */
export async function listPauseFlow(db: Database): Promise<PauseFlow[]> {
  const nodes = await loadNodes(db)
  const edges = await db.execute(sql`
    select t.from_reason_id as "from", t.to_reason_id as "to"
    from public.pause_transitions t
  `)
  const edgeRows = edges.rows as FlowEdge[]
  const byRoot = new Map<string, PauseFlow>()
  for (const node of nodes) {
    const flow = byRoot.get(node.root_id) ?? {
      rootId: node.root_id,
      rootName: node.name,
      nodes: [],
      edges: [],
    }
    flow.nodes.push({
      id: node.id,
      parentId: node.parent_id,
      name: node.name,
      kind: node.pause_step_kind,
      active: node.active,
    })
    byRoot.set(node.root_id, flow)
  }
  for (const flow of byRoot.values()) {
    const ids = new Set(flow.nodes.map((node) => node.id))
    flow.edges = edgeRows.filter(
      (edge) => ids.has(edge.from) && ids.has(edge.to),
    )
  }
  return [...byRoot.values()].sort((left, right) =>
    left.rootName.localeCompare(right.rootName, 'es-MX'),
  )
}

function buildOutgoing(
  flow: PauseFlow,
  edges: FlowEdge[],
): Map<string, FlowEdge[]> {
  const byId = new Map(flow.nodes.map((node) => [node.id, node]))
  const outgoing = new Map<string, FlowEdge[]>()
  for (const edge of edges) {
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (!from || !to) {
      throw invalid('La arista debe unir nodos del mismo motivo')
    }
    if (edge.from === edge.to) throw invalid('Una arista no puede ser un ciclo')
    if (from.kind === 'exit') {
      throw invalid(`La salida "${from.name}" no puede tener siguientes`)
    }
    if (to.parentId === null) {
      throw invalid('La raíz del motivo no puede ser destino del flujo')
    }
    if (to.kind === null) {
      throw invalid(`El nodo "${to.name}" no tiene tipo de subestado`)
    }
    const list = outgoing.get(edge.from) ?? []
    list.push(edge)
    outgoing.set(edge.from, list)
  }
  return outgoing
}

function reachedFrom(
  rootId: string,
  outgoing: Map<string, FlowEdge[]>,
): Set<string> {
  const reached = new Set<string>()
  const queue = [rootId]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || reached.has(current)) continue
    reached.add(current)
    for (const edge of outgoing.get(current) ?? []) queue.push(edge.to)
  }
  return reached
}

function hasCycle(
  nodes: FlowNode[],
  outgoing: Map<string, FlowEdge[]>,
): boolean {
  const visiting = new Set<string>()
  const visited = new Set<string>()
  function visit(id: string): boolean {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const edge of outgoing.get(id) ?? []) {
      if (visit(edge.to)) return true
    }
    visiting.delete(id)
    visited.add(id)
    return false
  }
  return nodes.some((node) => visit(node.id))
}

function validateNodes(
  flow: PauseFlow,
  outgoing: Map<string, FlowEdge[]>,
  reached: Set<string>,
): void {
  for (const node of flow.nodes) {
    if (!node.active || node.parentId === null) continue
    if (node.kind === 'progress' && !(outgoing.get(node.id)?.length ?? 0)) {
      throw invalid(`El paso "${node.name}" no tiene un siguiente`)
    }
    if (!reached.has(node.id)) {
      throw invalid(`El nodo "${node.name}" no es alcanzable desde el motivo`)
    }
  }
}

function validateFlow(flow: PauseFlow, edges: FlowEdge[]): void {
  const outgoing = buildOutgoing(flow, edges)
  if (hasCycle(flow.nodes, outgoing)) {
    throw invalid('El flujo de pausa no puede tener ciclos')
  }
  const reached = reachedFrom(flow.rootId, outgoing)
  validateNodes(flow, outgoing, reached)

  const hasExit = flow.nodes.some(
    (node) => node.active && node.kind === 'exit' && reached.has(node.id),
  )
  if (!hasExit) {
    throw invalid('El motivo debe tener al menos una salida alcanzable')
  }
}

/** Reemplaza el flujo de un motivo. Se bloquea si hay una pausa abierta. */
export async function savePauseFlow(
  db: Database,
  rootId: string,
  body: unknown,
): Promise<void> {
  const { edges } = flowBodySchema.parse(body)
  const flows = await listPauseFlow(db)
  const flow = flows.find((item) => item.rootId === rootId)
  if (!flow) throw new AppError(404, 'not_found', 'Motivo no encontrado')
  validateFlow(flow, edges)

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`lock table public.pause_transitions in share row exclusive mode`,
    )
    const open = await tx.execute(sql`
      select 1 from public.ticket_pauses
      where root_reason_id = ${rootId} and closed_at is null
      limit 1
    `)
    if (open.rows[0]) {
      throw conflict(
        'El motivo tiene una pausa abierta; no puedes cambiar su flujo',
      )
    }
    await tx.execute(sql`
      delete from public.pause_transitions
      where from_reason_id in (
        with recursive tree(id) as (
          select id from public.reasons where id = ${rootId}
          union all
          select child.id
          from public.reasons child
          join tree on child.parent_id = tree.id
          where child.use = 'pause'
        )
        select id from tree
      )
    `)
    for (const edge of edges) {
      await tx.execute(sql`
        insert into public.pause_transitions (from_reason_id, to_reason_id)
        values (${edge.from}, ${edge.to})
      `)
    }
  })
}
