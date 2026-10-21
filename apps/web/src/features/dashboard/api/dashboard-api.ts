import { apiFetch } from '@/lib/api-client'

export interface ActivityItem {
  id: number
  ticketId: string
  type: string
  occurredAt: string
  folio: string
  actorName: string | null
}

type ActivityRow = {
  id: number
  ticket_id: string
  type: string
  occurred_at: string
  actor_name: string | null
  folio: string
}

export async function fetchRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const body = await apiFetch<{ items: ActivityRow[] }>(
    `/api/dashboard/activity?limit=${limit}`,
  )
  return body.items.map((row) => ({
    id: row.id,
    ticketId: row.ticket_id,
    type: row.type,
    occurredAt: row.occurred_at,
    folio: row.folio,
    actorName: row.actor_name,
  }))
}
