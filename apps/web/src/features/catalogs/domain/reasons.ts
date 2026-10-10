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

/**
 * Camino de selección desde los hijos del motivo hasta `value` (excluye el motivo).
 * Devuelve `[]` si `value` no es descendiente de `rootId`.
 */
export function pathToReason(
  reasons: ReasonOption[],
  rootId: string | null | undefined,
  value: string | null | undefined,
): string[] {
  if (!rootId || !value) return []
  const byId = new Map(reasons.map((reason) => [reason.id, reason]))
  const path: string[] = []
  let cursor: string | null | undefined = value
  let guard = 0
  while (cursor && guard < 50) {
    const reason = byId.get(cursor)
    if (!reason) return []
    path.unshift(reason.id)
    if (reason.parentId === rootId) return path
    cursor = reason.parentId
    guard += 1
  }
  return []
}
