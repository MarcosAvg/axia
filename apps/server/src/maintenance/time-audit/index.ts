import { sql } from 'drizzle-orm'

import type { Database } from '../../db/client.js'
import { columnExists, limitOf, runFinding, tableExists } from './helpers.js'
import { FINDINGS } from './queries/index.js'
import type { TimeAuditReport } from './types.js'

/**
 * Reporte de solo lectura sobre la consistencia del registro de tiempos.
 * No repara nada: la reparación vive en migraciones y acciones auditadas.
 */
export async function auditTime(
  db: Database,
  options: { limit?: number } = {},
): Promise<TimeAuditReport> {
  const limit = limitOf(options)
  const now = await db.execute(sql`select now() as at`)
  const generatedAt = new Date(
    (now.rows[0] as { at: Date | string }).at,
  ).toISOString()
  const availability = {
    hasConfidence: await columnExists(db, 'ticket_events', 'time_confidence'),
    hasAlerts: await tableExists(db, 'ticket_time_alerts'),
  }

  const findings = await Promise.all(
    FINDINGS.map((spec) => runFinding(db, spec, limit, availability)),
  )
  const sorted = findings.sort((left, right) =>
    left.key.localeCompare(right.key),
  )

  return {
    generatedAt,
    findings: sorted,
    totalFindings: sorted.reduce((sum, item) => sum + item.count, 0),
  }
}
