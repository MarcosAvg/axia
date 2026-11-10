import { sql, type SQL } from 'drizzle-orm'

import type { Database } from '../../db/client.js'
import type {
  FindingSpec,
  TimeAuditFinding,
  TimeAuditOptions,
} from './types.js'

type CountRow = { count: number | string }

type Availability = {
  hasConfidence: boolean
  hasAlerts: boolean
}

export function limitOf(options: TimeAuditOptions | undefined): number {
  const value = options?.limit ?? 10
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('El límite de muestras debe ser un entero mayor que cero')
  }
  return Math.min(value, 100)
}

export async function countOf(db: Database, query: SQL): Promise<number> {
  const result = await db.execute(query)
  return Number((result.rows[0] as CountRow | undefined)?.count ?? 0)
}

export async function samplesOf(
  db: Database,
  query: SQL,
): Promise<Array<Record<string, unknown>>> {
  const result = await db.execute(query)
  return result.rows as Array<Record<string, unknown>>
}

export async function columnExists(
  db: Database,
  table: string,
  column: string,
): Promise<boolean> {
  const result = await db.execute(sql`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = ${table}
        and column_name = ${column}
    ) as exists
  `)
  return Boolean((result.rows[0] as { exists: boolean } | undefined)?.exists)
}

export async function tableExists(
  db: Database,
  table: string,
): Promise<boolean> {
  const result = await db.execute(sql`
    select to_regclass(${`public.${table}`}) is not null as exists
  `)
  return Boolean((result.rows[0] as { exists: boolean } | undefined)?.exists)
}

function isAvailable(spec: FindingSpec, availability: Availability): boolean {
  if (spec.requiresConfidence && !availability.hasConfidence) return false
  if (spec.requiresAlerts && !availability.hasAlerts) return false
  return true
}

export async function runFinding(
  db: Database,
  spec: FindingSpec,
  limit: number,
  availability: Availability,
): Promise<TimeAuditFinding> {
  if (!isAvailable(spec, availability)) {
    return { key: spec.key, count: 0, samples: [], available: false }
  }
  return {
    key: spec.key,
    count: await countOf(db, spec.countQuery),
    samples: await samplesOf(db, spec.samplesQuery(limit)),
    available: true,
  }
}
