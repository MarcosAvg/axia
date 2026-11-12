import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import type { MetricsFilters } from './filters.js'
import {
  PHASE_KEYS,
  performancePredicate,
  phaseMinutes,
  phasePredicate,
  type MetricsTimeMode,
} from './phase-columns.js'
import { metricsBase } from './summary-sql.js'

type ProfileRow = Record<string, unknown>

function phaseValues(mode: MetricsTimeMode) {
  return sql.join(
    PHASE_KEYS.map(
      (key) => sql`
        select ${key}::text as phase, ${phaseMinutes(key, mode)} as value
        from base v
        where ${performancePredicate()}
          and ${phaseMinutes(key, mode)} > 0
          and ${phasePredicate(key)}
      `,
    ),
    sql` union all `,
  )
}

/** Perfil de la fila global: cuantiles, vallas de atípicos y cobertura. */
export async function distributionProfile(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
  mode: MetricsTimeMode,
) {
  const result = await db.execute(sql`
    with base as materialized (
      ${metricsBase(actor, filters, 'metrics.view', { scope: 'all' })}
    ),
    vals as (${phaseValues(mode)}),
    stats as (
      select
        phase,
        count(*)::int as n,
        avg(value) as mean,
        percentile_cont(0.25) within group (order by value) as p25,
        percentile_cont(0.5) within group (order by value) as p50,
        percentile_cont(0.75) within group (order by value) as p75,
        percentile_cont(0.9) within group (order by value) as p90,
        percentile_cont(0.95) within group (order by value) as p95,
        max(value) as max
      from vals
      group by phase
    ),
    bounds as (
      select
        *,
        p25 - 1.5 * (p75 - p25) as lower_fence,
        p75 + 1.5 * (p75 - p25) as upper_fence
      from stats
    ),
    outlier_counts as (
      select v.phase, count(*)::int as outliers
      from vals v
      join bounds b on b.phase = v.phase
      where v.value < b.lower_fence or v.value > b.upper_fence
      group by v.phase
    ),
    universe as (
      select count(*)::int as total
      from base v
      where ${performancePredicate()}
    )
    select b.*, coalesce(o.outliers, 0) as outliers, u.total
    from bounds b
    left join outlier_counts o on o.phase = b.phase
    cross join universe u
    order by b.p50 desc
  `)

  return result.rows.map((row) => profileRow(row as ProfileRow))
}

function profileRow(row: ProfileRow) {
  const n = Number(row.n)
  const total = Number(row.total)
  return {
    phase: String(row.phase),
    n,
    coverage: total > 0 ? n / total : 0,
    mean: Number(row.mean),
    median: Number(row.p50),
    p25: Number(row.p25),
    p75: Number(row.p75),
    p90: Number(row.p90),
    p95: Number(row.p95),
    max: Number(row.max),
    lowerFence: Number(row.lower_fence),
    upperFence: Number(row.upper_fence),
    outliers: Number(row.outliers),
    outlierRate: n > 0 ? Number(row.outliers) / n : 0,
  }
}
