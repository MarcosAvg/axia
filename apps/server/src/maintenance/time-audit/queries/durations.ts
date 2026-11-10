import { sql } from 'drizzle-orm'

import type { FindingSpec } from '../types.js'

export const DURATION_FINDINGS: FindingSpec[] = [
  {
    key: 'negative_assignment',
    countQuery: sql`
      select count(*)::int as count
      from public.ticket_assignments
      where ended_at < assigned_at
    `,
    samplesQuery: (limit) => sql`
      select id, ticket_id, stage, assigned_at, ended_at
      from public.ticket_assignments
      where ended_at < assigned_at
      order by ticket_id, id
      limit ${limit}
    `,
  },
  {
    key: 'negative_participant',
    countQuery: sql`
      select count(*)::int as count
      from public.ticket_participants
      where ended_at < started_at
    `,
    samplesQuery: (limit) => sql`
      select id, ticket_id, technician_id, started_at, ended_at
      from public.ticket_participants
      where ended_at < started_at
      order by ticket_id, id
      limit ${limit}
    `,
  },
  {
    key: 'negative_pause',
    countQuery: sql`
      select count(*)::int as count
      from public.ticket_pauses
      where closed_at < opened_at
    `,
    samplesQuery: (limit) => sql`
      select id, ticket_id, opened_at, closed_at
      from public.ticket_pauses
      where closed_at < opened_at
      order by ticket_id, id
      limit ${limit}
    `,
  },
  {
    key: 'negative_pause_step',
    countQuery: sql`
      select count(*)::int as count
      from public.ticket_pause_steps
      where exited_at < entered_at
    `,
    samplesQuery: (limit) => sql`
      select id, pause_id, entered_at, exited_at
      from public.ticket_pause_steps
      where exited_at < entered_at
      order by pause_id, id
      limit ${limit}
    `,
  },
]
