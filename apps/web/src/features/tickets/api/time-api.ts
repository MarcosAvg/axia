// Tiempos manuales: lectura de tramos registrados a mano y sus RPC de alta/anulación.
// Solo supervisor y administrador (permiso time.record_manual).

import { supabase } from '@/lib/supabase'
import type { ManualTimeSpan } from '../domain/types'
import { parseManualTimeSpan } from '../schemas'
import type { ManualTimeInput } from '../schemas'

const MANUAL_TIME_SELECT =
  'id, kind, started_at, ended_at, clock_class, voided_at, technician:technicians(full_name)'

export async function fetchManualTimeSpans(
  ticketId: string,
): Promise<ManualTimeSpan[]> {
  const { data, error } = await supabase
    .from('time_spans')
    .select(MANUAL_TIME_SELECT)
    .eq('ticket_id', ticketId)
    .eq('origin', 'manual')
    .order('started_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(parseManualTimeSpan)
}

export async function recordManualTime(
  ticketId: string,
  input: ManualTimeInput,
  clientRequestId: string,
): Promise<void> {
  const { error } = await supabase.rpc('time_span_record', {
    p_ticket_id: ticketId,
    p_kind: input.kind,
    p_started_at: input.startedAt,
    p_ended_at: input.endedAt,
    p_clock_class: input.clockClass,
    p_subject_technician_id: input.technicianId || undefined,
    p_client_request_id: clientRequestId,
  })
  if (error) throw error
}

export async function voidManualTime(
  ticketId: string,
  spanId: string,
  clientRequestId: string,
): Promise<void> {
  const { error } = await supabase.rpc('time_span_void', {
    p_ticket_id: ticketId,
    p_span_id: spanId,
    p_client_request_id: clientRequestId,
  })
  if (error) throw error
}
