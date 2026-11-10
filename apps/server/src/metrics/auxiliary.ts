import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import type { MetricsFilters } from './filters.js'
import { metricsBase } from './summary-sql.js'

/** Horas de apoyo auxiliar por técnico y categoría. */
export async function auxiliaryByCategory(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  const result = await db.execute(sql`
    with base as materialized (
      ${metricsBase(actor, filters, 'metrics.view', { scope: 'workload' })}
    )
    select
      tech.id as technician_id,
      tech.full_name as technician_name,
      cat.id as category_id,
      cat.name as category_name,
      count(distinct p.ticket_id)::int as tickets,
      coalesce(sum(
        greatest(coalesce(p.ended_at, now()), p.started_at) - p.started_at
      ), interval '0') as participation_time,
      coalesce(sum(public.work_calendar_overlap(
        p.work_calendar_id,
        p.started_at,
        greatest(coalesce(p.ended_at, now()), p.started_at)
      )), interval '0') as participation_time_labor
    from base b
    join public.ticket_participants p
      on p.ticket_id = b.id and p.participation_type = 'auxiliary'
    join public.technicians tech on tech.id = p.technician_id
    left join public.categories cat on cat.id = p.category_id
    group by tech.id, tech.full_name, cat.id, cat.name
    order by participation_time desc, public.natural_sort_key(tech.full_name)
  `)
  return result.rows
}
