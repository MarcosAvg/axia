-- Backfill histórico: repara lo demostrable, rellena snapshots inferidos y
-- reconstruye tramos. No reescribe horas ni marca como confiable lo que no lo
-- es; los desfases y alertas quedan para la auditoría.

do $$
declare
  repaired integer;
begin
  update public.ticket_participants
  set ended_at = greatest(ended_at, started_at)
  where ended_at < started_at;
  get diagnostics repaired = row_count;
  raise notice 'ticket_participants reparadas: %', repaired;

  update public.ticket_assignments
  set ended_at = greatest(ended_at, assigned_at)
  where ended_at < assigned_at;
  get diagnostics repaired = row_count;
  raise notice 'ticket_assignments reparadas: %', repaired;

  update public.ticket_pauses
  set closed_at = greatest(closed_at, opened_at)
  where closed_at < opened_at;
  get diagnostics repaired = row_count;
  raise notice 'ticket_pauses reparadas: %', repaired;

  update public.ticket_pause_steps
  set exited_at = greatest(exited_at, entered_at)
  where exited_at < entered_at;
  get diagnostics repaired = row_count;
  raise notice 'ticket_pause_steps reparadas: %', repaired;

  update public.tickets
  set closed_at = reported_at
  where closed_at < reported_at;
  get diagnostics repaired = row_count;
  raise notice 'tickets reparados: %', repaired;
end $$;

-- Valores inferidos: el calendario original no se conservó en el histórico.
update public.ticket_events
set work_calendar_id = public.ticket_calendar(ticket_id)
where work_calendar_id is null;

update public.time_spans
set work_calendar_id = public.ticket_calendar(ticket_id)
where work_calendar_id is null;

update public.ticket_participants
set work_calendar_id = public.ticket_calendar(ticket_id)
where work_calendar_id is null;

update public.ticket_pauses
set work_calendar_id = public.ticket_calendar(ticket_id)
where work_calendar_id is null;

-- Enlaces best-effort de filas históricas a su evento cuando es único.
update public.ticket_pauses p
set opened_event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = p.ticket_id and e.type = 'paused'
    and (e.client_request_id = p.client_request_id or e.occurred_at = p.opened_at)
  order by e.occurred_at, e.id limit 1
)
where p.opened_event_id is null;

update public.ticket_pauses p
set closed_event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = p.ticket_id and e.type = 'resumed'
    and e.occurred_at = p.closed_at
  order by e.occurred_at, e.id limit 1
)
where p.closed_event_id is null and p.closed_at is not null;

update public.ticket_pause_steps s
set entered_event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = (
    select p.ticket_id from public.ticket_pauses p where p.id = s.pause_id
  )
    and e.type in ('paused', 'pause_advanced')
    and e.occurred_at = s.entered_at
  order by e.occurred_at, e.id limit 1
)
where s.entered_event_id is null;

update public.ticket_pause_steps s
set exited_event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = (
    select p.ticket_id from public.ticket_pauses p where p.id = s.pause_id
  )
    and e.type in ('pause_advanced', 'resumed')
    and e.occurred_at = s.exited_at
  order by e.occurred_at, e.id limit 1
)
where s.exited_event_id is null and s.exited_at is not null;

update public.ticket_participants p
set started_event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = p.ticket_id
    and e.type in (
      'assigned_technician', 'reassigned_technician', 'auxiliary_added',
      'reopened', 'reactivated'
    )
    and e.occurred_at = p.started_at
  order by e.occurred_at, e.id limit 1
)
where p.started_event_id is null;

update public.ticket_participants p
set ended_event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = p.ticket_id
    and e.type in (
      'validated', 'rejected', 'cancelled', 'duplicate_marked',
      'claim_opened', 'claim_resolved', 'reassigned_supervisor',
      'capture_recaptured'
    )
    and e.occurred_at = p.ended_at
  order by e.occurred_at, e.id limit 1
)
where p.ended_event_id is null and p.ended_at is not null;

update public.ticket_assignments a
set assigned_event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = a.ticket_id
    and e.type in (
      'taken', 'assigned_technician', 'reassigned_technician',
      'reassigned_supervisor'
    )
    and e.occurred_at = a.assigned_at
  order by e.occurred_at, e.id limit 1
)
where a.assigned_event_id is null;

update public.ticket_assignments a
set ended_event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = a.ticket_id
    and e.type in (
      'assigned_technician', 'reassigned_technician', 'reassigned_supervisor',
      'capture_recaptured', 'validated', 'rejected', 'cancelled',
      'duplicate_marked', 'claim_opened', 'claim_resolved'
    )
    and e.occurred_at = a.ended_at
  order by e.occurred_at, e.id limit 1
)
where a.ended_event_id is null and a.ended_at is not null;

update public.ticket_validations v
set event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = v.ticket_id
    and e.cycle = v.cycle
    and e.type = 'validated'
    and e.payload->>'role' = v.validator_role
    and e.occurred_at = v.validated_at
  order by e.occurred_at, e.id limit 1
)
where v.event_id is null;

update public.ticket_claims c
set opened_event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = c.ticket_id and e.type = 'claim_opened'
    and (e.client_request_id = c.client_request_id or e.occurred_at = c.opened_at)
  order by e.occurred_at, e.id limit 1
)
where c.opened_event_id is null;

update public.ticket_claims c
set resolved_event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = c.ticket_id
    and e.type in ('claim_resolved', 'reopened')
    and e.occurred_at = c.resolved_at
  order by e.occurred_at, e.id limit 1
)
where c.resolved_event_id is null and c.resolved_at is not null;

update public.ticket_offers o
set offered_event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = o.ticket_id and e.type = 'offered'
    and e.occurred_at = o.offered_at
  order by e.occurred_at, e.id limit 1
)
where o.offered_event_id is null;

update public.ticket_offers o
set resolved_event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = o.ticket_id
    and e.type in ('taken', 'reassigned_supervisor')
    and e.occurred_at = o.resolved_at
  order by e.occurred_at, e.id limit 1
)
where o.resolved_event_id is null and o.resolved_at is not null;

update public.ticket_captures c
set event_id = (
  select e.id from public.ticket_events e
  where e.ticket_id = c.ticket_id and e.type = 'capture_recaptured'
    and e.occurred_at = c.changed_at
  order by e.occurred_at, e.id limit 1
)
where c.event_id is null;

-- El cierre se recalcula antes de reconstruir los tramos.
do $$
declare
  r record;
begin
  for r in select id from public.tickets loop
    perform public.recompute_ticket_closed_at(r.id);
  end loop;
end $$;

do $$
declare
  r record;
  rebuilt integer := 0;
begin
  for r in select id from public.tickets loop
    perform public.rebuild_ticket_time_spans(r.id);
    rebuilt := rebuilt + 1;
  end loop;
  raise notice 'tiquets reconstruidos: %', rebuilt;
end $$;
