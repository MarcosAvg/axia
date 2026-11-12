import type { Client } from 'pg'

type ReasonRow = {
  id: string
  use: string
  name: string
  parent_name: string | null
}

export type DemoReasons = {
  id: (use: string, name: string, parentName?: string) => string
}

function key(use: string, name: string, parentName?: string) {
  return `${use}\u0000${parentName ?? ''}\u0000${name}`
}

/** Catálogo de motivos activo, resuelto por uso, nombre y padre. */
export async function loadDemoReasons(client: Client): Promise<DemoReasons> {
  const result = await client.query<ReasonRow>(`
    select r.id, r.use::text, r.name, parent.name as parent_name
    from public.reasons r
    left join public.reasons parent on parent.id = r.parent_id
    where r.active
  `)
  const ids = new Map<string, string>()
  for (const row of result.rows) {
    ids.set(key(row.use, row.name, row.parent_name ?? undefined), row.id)
  }
  return {
    id(use, name, parentName) {
      const id = ids.get(key(use, name, parentName))
      if (!id) {
        throw new Error(
          `Demo reason not found: ${use} / ${parentName ?? '—'} / ${name}`,
        )
      }
      return id
    },
  }
}
