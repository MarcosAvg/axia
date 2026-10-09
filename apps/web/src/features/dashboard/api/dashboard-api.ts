// Acceso a datos del panel. Única capa del feature que habla con Supabase.

import { supabase } from '@/lib/supabase'

export interface ActivityItem {
  id: number
  type: string
  occurredAt: string
  folio: string
}

interface ActivityRow {
  id: number
  type: string
  occurred_at: string
  ticket: { folio: string } | { folio: string }[] | null
}

function folioOf(ticket: ActivityRow['ticket']): string {
  if (!ticket) return ''
  const row = Array.isArray(ticket) ? ticket[0] : ticket
  return row?.folio ?? ''
}

/** Últimos eventos visibles para el usuario (RLS). */
export async function fetchRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const { data, error } = await supabase
    .from('ticket_events')
    .select('id, type, occurred_at, ticket:tickets(folio)')
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)
  if (error) throw error
  return ((data ?? []) as unknown as ActivityRow[]).map((row) => ({
    id: row.id,
    type: row.type,
    occurredAt: row.occurred_at,
    folio: folioOf(row.ticket),
  }))
}
