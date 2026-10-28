import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import type { MetricsFilters } from './filters.js'
import { metricsBase } from './summary-sql.js'

/** Tiempos del tiquet que cada técnico lideró. */
export async function technicianTimes(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  const result = await db.execute(sql`
    with base as materialized (${metricsBase(actor, filters)})
    select
      tech.id as technician_id,
      tech.full_name as technician_name,
      count(distinct p.ticket_id)::int as tickets,
      coalesce(avg(extract(epoch from b.active_work_time) / 60), 0) as avg_active,
      coalesce(avg(extract(epoch from b.total_time) / 60), 0) as avg_total,
      coalesce(avg(extract(epoch from b.response_time) / 60), 0) as avg_response,
      coalesce(avg(extract(epoch from b.assignment_time) / 60), 0) as avg_assignment,
      coalesce(avg(extract(epoch from b.validation_time) / 60), 0) as avg_validation
    from base b
    join public.ticket_participants p
      on p.ticket_id = b.id and p.participation_type = 'leader'
    join public.technicians tech on tech.id = p.technician_id
    group by tech.id, tech.full_name
    order by count(distinct p.ticket_id) desc, tech.full_name
  `)
  return result.rows
}

/** Actividad de supervisión: ofertas, tomas, reasignaciones y validaciones. */
export async function supervisors(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  const result = await db.execute(sql`
    with base as materialized (${metricsBase(actor, filters)}),
    offers as (
      select
        o.supervisor_user_id,
        count(*)::int as offers,
        count(*) filter (where o.status = 'taken')::int as taken,
        count(*) filter (where o.status = 'offered')::int as pending,
        count(*) filter (where o.status = 'withdrawn')::int as withdrawn,
        coalesce(
          avg(extract(epoch from (o.resolved_at - o.offered_at)) / 60)
            filter (where o.status = 'taken'),
          0
        ) as avg_time_to_take
      from public.ticket_offers o
      join base b on b.id = o.ticket_id
      group by o.supervisor_user_id
    ),
    reassignments as (
      select e.actor_id as supervisor_user_id,
        count(distinct e.ticket_id)::int as reassigned
      from public.ticket_events e
      join base b on b.id = e.ticket_id
      where e.type = 'reassigned_supervisor' and e.actor_id is not null
      group by e.actor_id
    ),
    validations as (
      select v.validator_user_id as supervisor_user_id,
        count(distinct v.ticket_id)::int as validated
      from public.ticket_validations v
      join base b on b.id = v.ticket_id
      where v.validator_role = 'supervisor' and v.validator_user_id is not null
      group by v.validator_user_id
    )
    select
      u.id as supervisor_id,
      u.full_name as supervisor_name,
      o.offers,
      o.taken,
      o.pending,
      o.withdrawn,
      o.avg_time_to_take,
      coalesce(r.reassigned, 0) as reassigned,
      coalesce(v.validated, 0) as validated
    from offers o
    join public.users u on u.id = o.supervisor_user_id
    left join reassignments r on r.supervisor_user_id = u.id
    left join validations v on v.supervisor_user_id = u.id
    order by o.offers desc, u.full_name
  `)
  return result.rows
}

/** Pausas por subestado (el motivo más profundo de la cascada). */
export async function pauseSubstates(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  const result = await db.execute(sql`
    with base as materialized (${metricsBase(actor, filters)})
    select
      r.name as substate_name,
      count(distinct p.id)::int as pauses,
      coalesce(
        sum(extract(epoch from (coalesce(s.exited_at, now()) - s.entered_at)) / 60),
        0
      ) as pause_minutes
    from base b
    join public.ticket_pauses p on p.ticket_id = b.id
    join public.ticket_pause_steps s on s.pause_id = p.id
    join public.reasons r on r.id = s.reason_id
    where r.parent_id is not null
    group by r.id, r.name
    order by pauses desc, pause_minutes desc
  `)
  return result.rows
}
