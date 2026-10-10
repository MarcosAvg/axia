import type { ReasonOption } from './types'

export interface ReasonChoice {
  id: string
  label: string
  depth: number
}

const MAX_DEPTH = 50

/** Opciones de motivo con sangría según su profundidad en el árbol. */
export function indentReasons(reasons: ReasonOption[]): ReasonChoice[] {
  const byId = new Map(reasons.map((reason) => [reason.id, reason]))
  const depthOf = (reason: ReasonOption): number => {
    let depth = 0
    let cursor = reason.parentId
    while (cursor && byId.has(cursor) && depth < MAX_DEPTH) {
      depth += 1
      cursor = byId.get(cursor)?.parentId ?? null
    }
    return depth
  }
  return reasons.map((reason) => {
    const depth = depthOf(reason)
    return {
      id: reason.id,
      label: `${'— '.repeat(depth)}${reason.name}`,
      depth,
    }
  })
}

/** Hijos directos de un nodo (para avanzar el subestado). */
export function childReasons(
  reasons: ReasonOption[],
  parentId: string | null | undefined,
): ReasonOption[] {
  return reasons.filter((reason) => reason.parentId === (parentId ?? null))
}

/** Motivos raíz (sin padre): los que se ofrecen al pausar. */
export function rootReasons(reasons: ReasonOption[]): ReasonOption[] {
  return reasons.filter((reason) => reason.parentId === null)
}

/** Todos los descendientes de un nodo (excluye al propio nodo). */
export function descendantReasons(
  reasons: ReasonOption[],
  ancestorId: string | null | undefined,
): ReasonOption[] {
  if (!ancestorId) return []
  const childrenOf = new Map<string, ReasonOption[]>()
  for (const reason of reasons) {
    if (!reason.parentId) continue
    const list = childrenOf.get(reason.parentId) ?? []
    list.push(reason)
    childrenOf.set(reason.parentId, list)
  }
  const result: ReasonOption[] = []
  const stack = [...(childrenOf.get(ancestorId) ?? [])]
  while (stack.length > 0) {
    const current = stack.pop() as ReasonOption
    result.push(current)
    stack.push(...(childrenOf.get(current.id) ?? []))
  }
  return result
}
