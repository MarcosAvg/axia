-- Fase 6B: asignación del técnico de un tiquet importado (genérica, agnóstica).

create or replace function public.import_ticket_assign(
  p_ticket_id uuid,
  p_technician_id uuid,
  p_assigned_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.tickets;
  v_designated boolean;
  v_open uuid;
  v_at timestamptz;
begin
  perform public.require_permission('data.import');
  select * into v from public.tickets where id = p_ticket_id;
  if v.id is null then
    raise exception 'El tiquet no existe' using errcode = 'P0001';
  end if;
  if p_technician_id is null
     or not exists (select 1 from public.technicians where id = p_technician_id) then
    raise exception 'El técnico no existe' using errcode = 'P0001';
  end if;

  -- Ya asignado al mismo técnico: no duplica.
  select id into v_open from public.ticket_assignments
  where ticket_id = p_ticket_id and stage = 'technician' and ended_at is null
    and assignee_technician_id = p_technician_id
  limit 1;
  if v_open is not null then return; end if;

  v_at := coalesce(p_assigned_at, now());

  update public.ticket_assignments
  set ended_at = v_at
  where ticket_id = p_ticket_id and stage = 'technician' and ended_at is null;

  insert into public.ticket_assignments (
    ticket_id, cycle, stage, assignee_technician_id, assigned_by, assigned_at)
  values (p_ticket_id, v.cycle, 'technician', p_technician_id, auth.uid(), v_at);

  select exists (
    select 1 from public.technician_categories
    where technician_id = p_technician_id and category_id = v.category_id
  ) into v_designated;

  insert into public.ticket_participants (
    ticket_id, cycle, technician_id, participation_type, category_id, started_at)
  values (
    p_ticket_id, v.cycle, p_technician_id,
    case when v_designated then 'leader'::public.participation_type
         else 'auxiliary'::public.participation_type end,
    v.category_id, v_at);
end;
$$;
comment on function public.import_ticket_assign(uuid, uuid, timestamptz) is
  'Asigna el técnico de un tiquet importado (idempotente).';
revoke execute on function public.import_ticket_assign(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.import_ticket_assign(uuid, uuid, timestamptz) to authenticated;
