import { sql } from 'drizzle-orm'

export const qualityQueries = {
  metrics_satisfaction: sql`
    , metric (average_score, ratings) as (
      select round(avg(r.score)::numeric, 3), count(*)
        from public.ticket_ratings r
        join visible_tickets t on t.id = r.ticket_id
    )
    select * from metric
  `,
  metrics_sla: sql`
    , metric (with_target, met, compliance_rate, avg_target_minutes, avg_resolution_minutes) as (
      select
          count(*) filter (where s.target_minutes is not null and s.closed_at is not null),
          count(*) filter (where s.meets),
          round(
            count(*) filter (where s.meets)::numeric
              / nullif(count(*) filter (where s.target_minutes is not null and s.closed_at is not null), 0),
            4),
          avg(s.target_minutes) filter (where s.target_minutes is not null and s.closed_at is not null),
          avg(s.resolution_minutes) filter (where s.target_minutes is not null and s.closed_at is not null)
        from public.v_ticket_sla s
        join visible_tickets t on t.id = s.id
    )
    select * from metric
  `,
  metrics_sla_by_priority: sql`
    , metric (priority_id, priority_name, with_target, met, compliance_rate) as (
      select
          pr.id,
          pr.name,
          count(*) filter (where s.target_minutes is not null and s.closed_at is not null),
          count(*) filter (where s.meets),
          round(
            count(*) filter (where s.meets)::numeric
              / nullif(count(*) filter (where s.target_minutes is not null and s.closed_at is not null), 0),
            4)
        from public.v_ticket_sla s
        join visible_tickets t on t.id = s.id
        join public.priorities pr on pr.id = s.priority_id
        group by pr.id, pr.name
        order by pr.name
    )
    select * from metric
  `,
}
