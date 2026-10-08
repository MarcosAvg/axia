-- Fase 6C-2: reconstruir la línea de tiempo de un tiquet importado con las marcas de la fuente,
-- para que los tres intervalos (atención, trabajo y total) se calculen igual que en origen.
-- No rellena lo que la fuente no traía: solo inserta los eventos de las marcas presentes.

create or replace function public.import_ticket_timeline(
  p_ticket_id uuid,
  p_reported_at timestamptz default null,
  p_assigned_at timestamptz default null,
  p_finished_at timestamptz default null,
  p_closed_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.tickets;
  v_reported timestamptz;
  v_finished timestamptz;
begin
  perform public.require_permission('data.import');
  select * into v from public.tickets where id = p_ticket_id;
  if v.id is null then
    raise exception 'El tiquet no existe' using errcode = 'P0001';
  end if;

  -- Idempotente: si ya se reconstruyó la historia, no repite.
  if exists (
    select 1 from public.ticket_events
    where ticket_id = p_ticket_id and source = 'import'
      and type in ('created', 'assigned_technician')
  ) then
    return;
  end if;

  v_reported := coalesce(p_reported_at, v.reported_at);
  v_finished := coalesce(p_finished_at, p_closed_at);

  insert into public.ticket_events (ticket_id, cycle, type, occurred_at, source)
  values (p_ticket_id, v.cycle, 'created', v_reported, 'import');

  if p_assigned_at is not null then
    insert into public.ticket_events (ticket_id, cycle, type, occurred_at, source)
    values
      (p_ticket_id, v.cycle, 'assigned_technician', p_assigned_at, 'import'),
      (p_ticket_id, v.cycle, 'started', p_assigned_at, 'import');
  end if;

  if v_finished is not null then
    insert into public.ticket_events (ticket_id, cycle, type, occurred_at, source)
    values (p_ticket_id, v.cycle, 'attended', v_finished, 'import');
  end if;

  if p_closed_at is not null then
    update public.tickets set closed_at = p_closed_at where id = p_ticket_id;
    if (select status from public.tickets where id = p_ticket_id) = 'closed' then
      insert into public.ticket_events (ticket_id, cycle, type, occurred_at, source)
      values (p_ticket_id, v.cycle, 'validated', p_closed_at, 'import');
    end if;
  end if;
end;
$$;
comment on function public.import_ticket_timeline(uuid, timestamptz, timestamptz, timestamptz, timestamptz) is
  'Reconstruye la historia de un tiquet importado con las marcas de la fuente (idempotente).';
revoke execute on function public.import_ticket_timeline(uuid, timestamptz, timestamptz, timestamptz, timestamptz) from public, anon;
grant execute on function public.import_ticket_timeline(uuid, timestamptz, timestamptz, timestamptz, timestamptz) to authenticated;
