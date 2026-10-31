interface ReasonParent {
  id: string
  use?: string
  parentId?: string | null
}

/** Opciones del padre de un motivo, restringidas a su árbol de uso. */
export function reasonParentOptions<T extends ReasonParent>(
  options: T[],
  use: string,
  editingId?: string,
): T[] {
  const excluded = new Set(editingId ? [editingId] : [])
  let previousSize = -1
  while (previousSize !== excluded.size) {
    previousSize = excluded.size
    for (const option of options) {
      if (option.parentId && excluded.has(option.parentId))
        excluded.add(option.id)
    }
  }
  return options.filter(
    (option) => option.use === use && !excluded.has(option.id),
  )
}
