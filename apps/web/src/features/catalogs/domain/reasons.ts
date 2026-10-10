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
