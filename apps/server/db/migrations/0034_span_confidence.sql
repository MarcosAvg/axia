-- Copia la confianza del evento a los tramos que origina.
--
-- record_event_span no necesita cambiar su cuerpo: la función del trigger y
-- la reconstrucción fijan una variable de transacción antes de insertar. El
-- trigger de time_spans la aplica a cada tramo.

create or replace function public.time_spans_apply_confidence()
returns trigger
language plpgsql
as $$
begin
  new.time_confidence := coalesce(
    nullif(current_setting('axia.time_confidence', true), '')
      ::public.time_confidence,
    new.time_confidence
  );
  return new;
end;
$$;

drop trigger if exists time_spans_apply_confidence on public.time_spans;
create trigger time_spans_apply_confidence
  before insert on public.time_spans
  for each row execute function public.time_spans_apply_confidence();

create or replace function public.ticket_events_record_spans()
returns trigger
language plpgsql
as $$
begin
  perform set_config(
    'axia.time_confidence', new.time_confidence::text, true
  );
  perform public.record_event_span(new);
  return new;
end;
$$;

create or replace function public.tickets_open_initial_phase()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('axia.time_confidence', 'trusted', true);
  insert into public.time_spans (
    ticket_id, cycle, kind, started_at, time_confidence
  ) values (
    new.id, new.cycle, 'supervisor_response', new.reported_at, 'trusted'
  );
  return new;
end;
$$;

create or replace function public.rebuild_ticket_time_spans(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ticket record;
  v_event public.ticket_events%rowtype;
begin
  select t.reported_at, t.cycle, t.status, t.closed_at
  into v_ticket
  from public.tickets t where t.id = p_ticket_id;
  if not found then return; end if;

  delete from public.time_spans
  where ticket_id = p_ticket_id and origin = 'system';

  insert into public.time_spans (ticket_id, cycle, kind, started_at)
  values (
    p_ticket_id, 1, 'supervisor_response', v_ticket.reported_at
  );

  for v_event in
    select * from public.ticket_events
    where ticket_id = p_ticket_id
    order by occurred_at, id
  loop
    perform set_config(
      'axia.time_confidence', v_event.time_confidence::text, true
    );
    perform public.record_event_span(v_event);
  end loop;

  if v_ticket.status in ('closed', 'rejected', 'cancelled', 'duplicate') then
    update public.time_spans
    set ended_at = coalesce(v_ticket.closed_at, now())
    where id = (
      select ts.id
      from public.time_spans ts
      where ts.ticket_id = p_ticket_id
        and ts.origin = 'system'
        and ts.kind in (
          'supervisor_response', 'pending_take', 'technician_assignment',
          'wait_start', 'active_work', 'pause', 'validation', 'claim'
        )
      order by ts.started_at desc, ts.id desc
      limit 1
    )
      and (
        ended_at is null
        or ended_at < coalesce(v_ticket.closed_at, now())
      );
  end if;
end;
$$;
