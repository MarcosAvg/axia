import type { SQL } from 'drizzle-orm'

export type TimeAuditFinding = {
  key: string
  count: number
  samples: Array<Record<string, unknown>>
  available: boolean
}

export type TimeAuditReport = {
  generatedAt: string
  findings: TimeAuditFinding[]
  totalFindings: number
}

export type TimeAuditOptions = {
  limit?: number
}

export type FindingSpec = {
  key: string
  countQuery: SQL
  samplesQuery: (limit: number) => SQL
  requiresConfidence?: boolean
  requiresAlerts?: boolean
}
