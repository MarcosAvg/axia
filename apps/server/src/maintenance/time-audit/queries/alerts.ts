import { sql } from 'drizzle-orm'

import type { FindingSpec } from '../types.js'

export const ALERT_FINDINGS: FindingSpec[] = [
  {
    key: 'evidence_cycle_mismatch',
    countQuery: sql`
      select count(*)::int as count
      from public.evidence e
      join public.tickets t on t.id = e.ticket_id
      join lateral (
        select max(ev.occurred_at) as occurred_at
        from public.ticket_events ev
        where ev.ticket_id = e.ticket_id
          and ev.type = 'reopened'
          and ev.cycle = t.cycle
      ) r on true
      where e.cycle < t.cycle
        and r.occurred_at is not null
        and e.created_at >= r.occurred_at
    `,
    samplesQuery: (limit) => sql`
      select e.id, e.ticket_id, e.cycle, t.cycle as current_cycle,
        e.created_at, r.occurred_at as last_reopen
      from public.evidence e
      join public.tickets t on t.id = e.ticket_id
      join lateral (
        select max(ev.occurred_at) as occurred_at
        from public.ticket_events ev
        where ev.ticket_id = e.ticket_id
          and ev.type = 'reopened'
          and ev.cycle = t.cycle
      ) r on true
      where e.cycle < t.cycle
        and r.occurred_at is not null
        and e.created_at >= r.occurred_at
      order by e.created_at, e.id
      limit ${limit}
    `,
  },
  {
    key: 'open_time_alerts',
    requiresAlerts: true,
    countQuery: sql`
      select count(*)::int as count
      from public.ticket_time_alerts
      where status = 'open'
    `,
    samplesQuery: (limit) => sql`
      select id, ticket_id, event_id, kind, client_clock_skew_ms,
        suggested_occurred_at, detected_at
      from public.ticket_time_alerts
      where status = 'open'
      order by detected_at, id
      limit ${limit}
    `,
  },
  {
    key: 'unverified_events',
    requiresConfidence: true,
    countQuery: sql`
      select count(*)::int as count
      from public.ticket_events
      where time_confidence = 'unverified'
    `,
    samplesQuery: (limit) => sql`
      select id, ticket_id, type, occurred_at, client_reported_at,
        client_clock_skew_ms, time_confidence
      from public.ticket_events
      where time_confidence = 'unverified'
      order by occurred_at, id
      limit ${limit}
    `,
  },
]
