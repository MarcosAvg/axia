import { sql, type SQL } from 'drizzle-orm'

export type TicketCycleTimes = {
  total: number
  response: number
  assignment: number
  pendingTake: number
  reassignment: number
  wait: number
  active: number
  pause: number
  dormant: number
  validation: number
  claim: number
}

export function toCycleTimes(
  row: Record<string, unknown>,
  mode: 'calendar' | 'laboral' | 'extra' = 'calendar',
): TicketCycleTimes {
  const suffix = mode === 'calendar' ? '' : `_${mode}`
  const value = (key: string) => Number(row[`${key}_minutes${suffix}`] ?? 0)
  return {
    total: value('total'),
    response: value('response'),
    assignment: value('assignment'),
    pendingTake: value('pending_take'),
    reassignment: value('reassignment'),
    wait: value('wait'),
    active: value('active'),
    pause: value('pause'),
    dormant: value('dormant'),
    validation: value('validation'),
    claim: value('claim'),
  }
}

function timingColumns(): SQL {
  return sql`
      extract(epoch from (coalesce(t.closed_at, now()) - t.reported_at)) / 60 as total_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'supervisor_response'::public.time_span_kind)) / 60 as response_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'technician_assignment'::public.time_span_kind)) / 60 as assignment_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'pending_take'::public.time_span_kind)) / 60 as pending_take_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'reassignment'::public.time_span_kind)) / 60 as reassignment_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'wait_start'::public.time_span_kind)) / 60 as wait_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'active_work'::public.time_span_kind)) / 60 as active_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'pause'::public.time_span_kind)) / 60 as pause_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'dormant'::public.time_span_kind)) / 60 as dormant_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'validation'::public.time_span_kind)) / 60 as validation_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'claim'::public.time_span_kind)) / 60 as claim_minutes
  `
}

function laborTimingColumns(): SQL {
  return sql`
      extract(epoch from public.ticket_time_total_laboral(t.id)) / 60 as total_minutes_labor,
      extract(epoch from public.ticket_time_by_kind_laboral(t.id, 'supervisor_response'::public.time_span_kind)) / 60 as response_minutes_labor,
      extract(epoch from public.ticket_time_by_kind_laboral(t.id, 'technician_assignment'::public.time_span_kind)) / 60 as assignment_minutes_labor,
      extract(epoch from public.ticket_time_by_kind_laboral(t.id, 'pending_take'::public.time_span_kind)) / 60 as pending_take_minutes_labor,
      extract(epoch from public.ticket_time_by_kind_laboral(t.id, 'reassignment'::public.time_span_kind)) / 60 as reassignment_minutes_labor,
      extract(epoch from public.ticket_time_by_kind_laboral(t.id, 'wait_start'::public.time_span_kind)) / 60 as wait_minutes_labor,
      extract(epoch from public.ticket_time_by_kind_laboral(t.id, 'active_work'::public.time_span_kind)) / 60 as active_minutes_labor,
      extract(epoch from public.ticket_time_by_kind_laboral(t.id, 'pause'::public.time_span_kind)) / 60 as pause_minutes_labor,
      extract(epoch from public.ticket_time_by_kind_laboral(t.id, 'dormant'::public.time_span_kind)) / 60 as dormant_minutes_labor,
      extract(epoch from public.ticket_time_by_kind_laboral(t.id, 'validation'::public.time_span_kind)) / 60 as validation_minutes_labor,
      extract(epoch from public.ticket_time_by_kind_laboral(t.id, 'claim'::public.time_span_kind)) / 60 as claim_minutes_labor
  `
}

function extraTimingColumns(): SQL {
  return sql`
      greatest(0, extract(epoch from (coalesce(t.closed_at, now()) - t.reported_at) - public.ticket_time_total_laboral(t.id)) / 60) as total_minutes_extra,
      extract(epoch from public.ticket_time_by_kind_extra(t.id, 'supervisor_response'::public.time_span_kind)) / 60 as response_minutes_extra,
      extract(epoch from public.ticket_time_by_kind_extra(t.id, 'technician_assignment'::public.time_span_kind)) / 60 as assignment_minutes_extra,
      extract(epoch from public.ticket_time_by_kind_extra(t.id, 'pending_take'::public.time_span_kind)) / 60 as pending_take_minutes_extra,
      extract(epoch from public.ticket_time_by_kind_extra(t.id, 'reassignment'::public.time_span_kind)) / 60 as reassignment_minutes_extra,
      extract(epoch from public.ticket_time_by_kind_extra(t.id, 'wait_start'::public.time_span_kind)) / 60 as wait_minutes_extra,
      extract(epoch from public.ticket_time_by_kind_extra(t.id, 'active_work'::public.time_span_kind)) / 60 as active_minutes_extra,
      extract(epoch from public.ticket_time_by_kind_extra(t.id, 'pause'::public.time_span_kind)) / 60 as pause_minutes_extra,
      extract(epoch from public.ticket_time_by_kind_extra(t.id, 'validation'::public.time_span_kind)) / 60 as validation_minutes_extra,
      extract(epoch from public.ticket_time_by_kind_extra(t.id, 'claim'::public.time_span_kind)) / 60 as claim_minutes_extra,
      0 as dormant_minutes_extra
  `
}

export function cycleTimeColumns(): SQL {
  return sql`${timingColumns()}, ${laborTimingColumns()}, ${extraTimingColumns()}`
}
