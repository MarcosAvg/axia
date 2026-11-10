import { sql } from 'drizzle-orm'

import type { FindingSpec } from '../types.js'

export const TIME_FINDINGS: FindingSpec[] = [
  {
    key: 'coverage_delta',
    countQuery: sql`
      select count(*)::int as count
      from public.v_ticket_phase_coverage
      where delta <> interval '0'
    `,
    samplesQuery: (limit) => sql`
      select c.id, t.folio, c.status, c.total_time, c.phase_time, c.delta
      from public.v_ticket_phase_coverage c
      join public.tickets t on t.id = c.id
      where c.delta <> interval '0'
      order by c.id
      limit ${limit}
    `,
  },
  {
    key: 'event_drift',
    countQuery: sql`
      select count(*)::int as count
      from public.ticket_events
      where abs(extract(epoch from (recorded_at - occurred_at))) > 300
    `,
    samplesQuery: (limit) => sql`
      select id, ticket_id, type, occurred_at, recorded_at,
        round(extract(epoch from (recorded_at - occurred_at)))::bigint
          as drift_seconds
      from public.ticket_events
      where abs(extract(epoch from (recorded_at - occurred_at))) > 300
      order by abs(extract(epoch from (recorded_at - occurred_at))) desc
      limit ${limit}
    `,
  },
  {
    key: 'event_out_of_bounds',
    countQuery: sql`
      select count(*)::int as count
      from public.ticket_events e
      join public.tickets t on t.id = e.ticket_id
      where e.occurred_at < t.reported_at
        or (
          t.closed_at is not null
          and e.occurred_at > t.closed_at + interval '1 minute'
        )
    `,
    samplesQuery: (limit) => sql`
      select e.id, e.ticket_id, t.folio, e.type, e.occurred_at,
        t.reported_at, t.closed_at
      from public.ticket_events e
      join public.tickets t on t.id = e.ticket_id
      where e.occurred_at < t.reported_at
        or (
          t.closed_at is not null
          and e.occurred_at > t.closed_at + interval '1 minute'
        )
      order by e.occurred_at, e.id
      limit ${limit}
    `,
  },
  {
    key: 'pause_span_vs_table',
    countQuery: sql`
      select count(*)::int as count
      from public.tickets t
      cross join lateral (
        select coalesce(
          sum(coalesce(p.closed_at, now()) - p.opened_at),
          interval '0'
        ) as table_pause
        from public.ticket_pauses p
        where p.ticket_id = t.id
      ) p
      where p.table_pause <> interval '0'
        and abs(extract(epoch from (
          public.ticket_time_by_kind(
            t.id, 'pause'::public.time_span_kind
          ) - p.table_pause
        ))) > 1
    `,
    samplesQuery: (limit) => sql`
      select t.id, t.folio,
        public.ticket_time_by_kind(
          t.id, 'pause'::public.time_span_kind
        ) as span_pause,
        p.table_pause
      from public.tickets t
      cross join lateral (
        select coalesce(
          sum(coalesce(p.closed_at, now()) - p.opened_at),
          interval '0'
        ) as table_pause
        from public.ticket_pauses p
        where p.ticket_id = t.id
      ) p
      where p.table_pause <> interval '0'
        and abs(extract(epoch from (
          public.ticket_time_by_kind(
            t.id, 'pause'::public.time_span_kind
          ) - p.table_pause
        ))) > 1
      order by t.id
      limit ${limit}
    `,
  },
]
