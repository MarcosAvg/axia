// Llamadas del adaptador a las RPCs genéricas del núcleo y lectura de catálogos para resolver alias.

import type { Database, Json } from '@axia/shared'
import type { TicketStatus } from '@/features/tickets'
import { supabase } from '@/lib/supabase'

type TableName = keyof Database['public']['Tables']

export async function startBatch(
  system: string,
  mode: 'dry_run' | 'commit',
): Promise<string> {
  const { data, error } = await supabase.rpc('import_batch_start', {
    p_system: system,
    p_mode: mode,
  })
  if (error) throw error
  return data as string
}

export async function finishBatch(
  batchId: string,
  status: 'completed' | 'failed',
  summary: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.rpc('import_batch_finish', {
    p_batch_id: batchId,
    p_status: status,
    p_summary: summary as Json,
  })
  if (error) throw error
}

export async function addRecord(input: {
  batchId: string
  rowNumber: number
  raw: Record<string, unknown>
  result: 'inserted' | 'updated' | 'skipped' | 'error' | 'pending'
  ticketId?: string
  error?: string
}): Promise<void> {
  const { error } = await supabase.rpc('import_record_add', {
    p_batch_id: input.batchId,
    p_row_number: input.rowNumber,
    p_raw: input.raw as Json,
    p_result: input.result,
    p_ticket_id: input.ticketId,
    p_error: input.error,
  })
  if (error) throw error
}

export async function resolveAlias(
  catalog: string,
  alias: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('import_alias_get', {
    p_catalog: catalog,
    p_alias: alias,
  })
  if (error) throw error
  return (data as string | null) ?? null
}

export async function setAlias(
  catalog: string,
  alias: string,
  recordId: string,
): Promise<void> {
  const { error } = await supabase.rpc('import_alias_set', {
    p_catalog: catalog,
    p_alias: alias,
    p_record_id: recordId,
  })
  if (error) throw error
}

export async function resolveStatus(
  system: string,
  externalStatus: string,
): Promise<TicketStatus | null> {
  const { data, error } = await supabase.rpc('import_status_get', {
    p_system: system,
    p_external_status: externalStatus,
  })
  if (error) throw error
  return (data as TicketStatus | null) ?? null
}

export async function setStatus(
  system: string,
  externalStatus: string,
  ticketStatus: TicketStatus,
): Promise<void> {
  const { error } = await supabase.rpc('import_status_set', {
    p_system: system,
    p_external_status: externalStatus,
    p_ticket_status: ticketStatus,
  })
  if (error) throw error
}

export async function upsertTicket(
  system: string,
  externalId: string,
  data: Record<string, unknown>,
): Promise<string> {
  const { data: ticketId, error } = await supabase.rpc('import_ticket_upsert', {
    p_system: system,
    p_external_id: externalId,
    p_data: data as Json,
  })
  if (error) throw error
  return ticketId as string
}

export async function assignTicket(
  ticketId: string,
  technicianId: string,
  assignedAt: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('import_ticket_assign', {
    p_ticket_id: ticketId,
    p_technician_id: technicianId,
    p_assigned_at: assignedAt ?? undefined,
  })
  if (error) throw error
}

/** Zona horaria configurada de la instancia (para interpretar las fechas de la fuente). */
export async function fetchInstanceTimezone(): Promise<string> {
  const { data, error } = await supabase
    .from('instance_settings')
    .select('timezone')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.timezone ?? 'UTC'
}

const CATALOG_TABLES: Record<string, { table: TableName; label: string }> = {
  buildings: { table: 'buildings', label: 'name' },
  locations: { table: 'locations', label: 'name' },
  dependencies: { table: 'dependencies', label: 'name' },
  categories: { table: 'categories', label: 'name' },
  subcategories: { table: 'subcategories', label: 'name' },
  problems: { table: 'problems', label: 'name' },
  service_types: { table: 'service_types', label: 'name' },
  priorities: { table: 'priorities', label: 'name' },
  technicians: { table: 'technicians', label: 'full_name' },
  channels: { table: 'channels', label: 'name' },
  requesters: { table: 'requesters', label: 'full_name' },
}

export interface CatalogOption {
  id: string
  label: string
}

/** Opciones (id + etiqueta) de un catálogo, para resolver alias. */
export async function fetchCatalogOptions(
  catalog: string,
): Promise<CatalogOption[]> {
  const config = CATALOG_TABLES[catalog]
  if (!config) return []
  const { data, error } = await supabase
    .from(config.table)
    .select(`id, ${config.label}`)
    .order(config.label)
  if (error) throw error
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    label: String(row[config.label] ?? ''),
  }))
}
