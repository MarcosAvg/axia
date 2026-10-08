// Administración de la importación genérica: mapeo de estatus y lotes.
// (La lectura de la fuente y la normalización viven en el adaptador aislado; esto es del núcleo.)

import { supabase } from '@/lib/supabase'
import type { TicketStatus } from '@/features/tickets'

export interface StatusMapRow {
  id: string
  system: string
  externalStatus: string
  ticketStatus: TicketStatus
}

export interface ImportBatchRow {
  id: string
  system: string
  mode: string
  status: string
  startedAt: string
  finishedAt: string | null
}

interface StatusMapRecord {
  id: string
  system: string
  external_status: string
  ticket_status: TicketStatus
}

export async function fetchStatusMaps(): Promise<StatusMapRow[]> {
  const { data, error } = await supabase
    .from('import_status_map')
    .select('id, system, external_status, ticket_status')
    .order('system')
    .order('external_status')
  if (error) throw error
  return ((data ?? []) as StatusMapRecord[]).map((row) => ({
    id: row.id,
    system: row.system,
    externalStatus: row.external_status,
    ticketStatus: row.ticket_status,
  }))
}

export async function setStatusMap(input: {
  system: string
  externalStatus: string
  ticketStatus: TicketStatus
}): Promise<void> {
  const { error } = await supabase.rpc('import_status_set', {
    p_system: input.system,
    p_external_status: input.externalStatus,
    p_ticket_status: input.ticketStatus,
  })
  if (error) throw error
}

export async function fetchImportBatches(): Promise<ImportBatchRow[]> {
  const { data, error } = await supabase
    .from('import_batches')
    .select('id, system, mode, status, started_at, finished_at')
    .order('started_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (
    (data ?? []) as {
      id: string
      system: string
      mode: string
      status: string
      started_at: string
      finished_at: string | null
    }[]
  ).map((row) => ({
    id: row.id,
    system: row.system,
    mode: row.mode,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  }))
}
