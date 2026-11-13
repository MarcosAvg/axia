import { sql } from 'drizzle-orm'

export const activityQueries = {
  metrics_by_technician: sql`
    , metric (technician_id, technician_name, tickets, leader_count, auxiliary_count, participation_time, participation_time_labor, participation_time_extra, assigned_count) as (
      select
          p.technician_id,
          tech.full_name,
          count(distinct p.ticket_id),
          count(*) filter (where p.participation_type = 'leader'),
          count(*) filter (where p.participation_type = 'auxiliary'),
          sum(coalesce(p.ended_at, now()) - p.started_at),
          sum(public.work_calendar_overlap(
            p.work_calendar_id,
            p.started_at,
            coalesce(p.ended_at, now()))),
          sum(coalesce(p.ended_at, now()) - p.started_at)
            - sum(public.work_calendar_overlap(
                p.work_calendar_id,
                p.started_at,
                coalesce(p.ended_at, now()))),
          (select count(*)
             from public.ticket_assignments a
             join visible_tickets ta on ta.id = a.ticket_id
            where a.assignee_technician_id = p.technician_id
              and a.stage = 'technician')
        from public.ticket_participants p
        join public.technicians tech on tech.id = p.technician_id
        join visible_tickets t on t.id = p.ticket_id
        group by p.technician_id, tech.full_name
        order by count(distinct p.ticket_id) desc
    )
    select * from metric
  `,
  metrics_duplicate_alerts: sql`
    , metric (decision, candidates, tickets) as (
      select coalesce(c.decision, 'pending'), count(*), count(distinct c.ticket_id)
        from public.ticket_duplicate_candidates c
        join visible_tickets t on t.id = c.ticket_id
        group by coalesce(c.decision, 'pending')
    )
    select * from metric
  `,
  metrics_duplicate_tickets: sql`
    , metric (time_to_mark) as (
      select min(e.occurred_at) - t.reported_at
        from visible_tickets t
        left join public.ticket_events e
          on e.ticket_id = t.id and e.type = 'duplicate_marked'
        where t.status = 'duplicate'
        group by t.id, t.reported_at
    )
    select * from metric
  `,
  metrics_duplicates_by_dimension: sql`
    , metric (dimension, dimension_id, dimension_name, tickets, duplicates, duplicate_rate) as (
      with base as (
          select
            t.team_id,
            t.building_id,
            t.category_id,
            t.dependency_id,
            t.requester_id,
            t.status
          from visible_tickets t
        ),
        agg as (
          select
            grouping(b.team_id) as g_team,
            grouping(b.building_id) as g_building,
            grouping(b.category_id) as g_category,
            grouping(b.dependency_id) as g_dependency,
            b.team_id,
            b.building_id,
            b.category_id,
            b.dependency_id,
            b.requester_id,
            count(*) as tickets,
            count(*) filter (where b.status = 'duplicate') as duplicates
          from base b
          group by grouping sets (
            (b.team_id), (b.building_id), (b.category_id), (b.dependency_id), (b.requester_id)
          )
        )
        select
          case
            when agg.g_team = 0 then 'team'
            when agg.g_building = 0 then 'building'
            when agg.g_category = 0 then 'category'
            when agg.g_dependency = 0 then 'dependency'
            else 'requester'
          end,
          coalesce(agg.team_id, agg.building_id, agg.category_id, agg.dependency_id, agg.requester_id),
          coalesce(tm.name, bld.name, cat.name, dep.name, req.full_name),
          agg.tickets,
          agg.duplicates,
          round(agg.duplicates::numeric / nullif(agg.tickets, 0), 4)
        from agg
        left join public.teams tm on tm.id = agg.team_id
        left join public.buildings bld on bld.id = agg.building_id
        left join public.categories cat on cat.id = agg.category_id
        left join public.dependencies dep on dep.id = agg.dependency_id
        left join public.requesters req on req.id = agg.requester_id
    )
    select * from metric
  `,
  metrics_pauses_by_reason: sql`
    , metric (reason_id, reason_name, pauses, pause_time, pause_time_labor) as (
      select
          r.id,
          r.name,
          count(*),
          sum(coalesce(p.closed_at, now()) - p.opened_at),
          sum(public.work_calendar_overlap(
            p.work_calendar_id,
            p.opened_at,
            coalesce(p.closed_at, now())))
        from public.ticket_pauses p
        join public.reasons r on r.id = p.reason_id
        join visible_tickets t on t.id = p.ticket_id
        group by r.id, r.name
        order by count(*) desc
    )
    select * from metric
  `,
  metrics_reject_cancel_by_reason: sql`
    , metric (event_type, reason_id, reason_name, tickets) as (
      select t.status::text, r.id, r.name, count(*)
        from visible_tickets t
        join lateral (
          select e.reason_id
          from public.ticket_events e
          where e.ticket_id = t.id
            and e.type in ('rejected', 'cancelled')
            and e.reason_id is not null
          order by e.occurred_at desc, e.id desc
          limit 1
        ) last on true
        join public.reasons r on r.id = last.reason_id
        where t.status in ('rejected', 'cancelled')
        group by t.status, r.id, r.name
        order by count(*) desc
    )
    select * from metric
  `,
  metrics_routing: sql`
    , metric (offers, pending_offers, taken, avg_time_to_take) as (
      with base as (
          select
            t.id,
            (select count(*) from public.ticket_offers o where o.ticket_id = t.id) as offers,
            (select count(*) from public.ticket_offers o
              where o.ticket_id = t.id
                and o.cycle = t.cycle
                and o.status = 'offered') as pending_offers,
            (select count(*) from public.ticket_offers o
              where o.ticket_id = t.id and o.status = 'taken') as taken,
            (select min(o.resolved_at) from public.ticket_offers o
              where o.ticket_id = t.id and o.status = 'taken') - t.reported_at as time_to_take
          from visible_tickets t
        )
        select
          sum(offers),
          count(distinct id) filter (where pending_offers > 0),
          sum(taken),
          avg(time_to_take)
        from base
    )
    select * from metric
  `,
}
