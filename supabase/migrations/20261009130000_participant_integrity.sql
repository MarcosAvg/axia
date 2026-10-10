-- Integridad de participantes: una participación ACTIVA por técnico y tiquet.
-- Cierra los duplicados activos existentes y evita que vuelvan a ocurrir.

-- 1. Saneamiento: si hay varias activas del mismo técnico, se conserva la más antigua.
with ranked as (
  select id,
         row_number() over (
           partition by ticket_id, technician_id
           order by started_at, created_at, id
         ) as rn
  from public.ticket_participants
  where ended_at is null
)
update public.ticket_participants p
set ended_at = now()
from ranked r
where p.id = r.id and r.rn > 1;

-- 2. Índice único parcial: un técnico no puede participar dos veces a la vez.
create unique index if not exists ticket_participants_active_unique
  on public.ticket_participants (ticket_id, technician_id)
  where ended_at is null;

-- 3. Al cerrar/terminar el tiquet o cambiar de ciclo, se cierran las participaciones.
create or replace function public.tickets_close_participants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.status in ('closed', 'rejected', 'cancelled', 'duplicate')
        and new.status is distinct from old.status)
     or (new.cycle is distinct from old.cycle) then
    update public.ticket_participants
    set ended_at = now()
    where ticket_id = new.id and ended_at is null;
  end if;
  return new;
end;
$$;
comment on function public.tickets_close_participants() is
  'Cierra las participaciones activas al cerrar/terminar el tiquet o cambiar de ciclo.';

drop trigger if exists tickets_close_participants on public.tickets;
create trigger tickets_close_participants
after update on public.tickets
for each row execute function public.tickets_close_participants();

-- 4. Asignar técnico: cierra al líder anterior y reutiliza/promueve al técnico.
create or replace function public.ticket_assign_technician(
  p_ticket_id uuid, p_technician_id uuid,
  p_reason_id uuid default null, p_client_request_id uuid default null)
returns void
language plpgsql
security definer
set search_path to public, extensions, pg_temp
as $$
declare
  v_ticket public.tickets;
  v_designated boolean;
  v_existing uuid;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.assign_technician');

  select * into v_ticket from public.tickets where id = p_ticket_id;
  if v_ticket.status not in ('registered', 'with_supervisor', 'assigned') then
    raise exception 'No se puede asignar técnico en el estado %', v_ticket.status using errcode = 'P0001';
  end if;

  -- Cierra la asignación de técnico anterior, si había.
  update public.ticket_assignments set ended_at = now()
  where ticket_id = p_ticket_id and stage = 'technician' and ended_at is null;

  -- Si venía de un registro, se retiran las ofertas.
  update public.ticket_offers
  set status = 'withdrawn', resolved_at = now()
  where ticket_id = p_ticket_id and status = 'offered';

  update public.tickets
  set status = 'assigned',
      cycle = case when cycle is null then 1 else cycle end
  where id = p_ticket_id;

  insert into public.ticket_assignments (
    ticket_id, cycle, stage, assignee_technician_id, assigned_by, reason_id)
  values (p_ticket_id, v_ticket.cycle, 'technician', p_technician_id, auth.uid(), p_reason_id);

  select exists (
    select 1 from public.technician_categories
    where technician_id = p_technician_id and category_id = v_ticket.category_id
  ) into v_designated;

  -- Cierra la participación del líder anterior (si es otro técnico).
  update public.ticket_participants
  set ended_at = now()
  where ticket_id = p_ticket_id and ended_at is null
    and participation_type = 'leader'
    and technician_id <> p_technician_id;

  -- Reutiliza la participación activa del técnico; si no hay, la crea.
  select id into v_existing
  from public.ticket_participants
  where ticket_id = p_ticket_id and technician_id = p_technician_id
    and ended_at is null
  limit 1;

  if v_existing is not null then
    update public.ticket_participants
    set participation_type =
          case when v_designated then 'leader'::public.participation_type
               else participation_type end,
        category_id = v_ticket.category_id
    where id = v_existing;
  else
    insert into public.ticket_participants (
      ticket_id, cycle, technician_id, participation_type, category_id)
    values (
      p_ticket_id, v_ticket.cycle, p_technician_id,
      case when v_designated then 'leader'::public.participation_type
           else 'auxiliary'::public.participation_type end,
      v_ticket.category_id);
  end if;

  perform public.write_event(
    p_ticket_id, 'assigned_technician',
    jsonb_build_object('technician_id', p_technician_id, 'auxiliary', not v_designated),
    p_reason_id, null, p_technician_id, p_client_request_id);
end;
$$;

-- 5. Agregar auxiliar: guardia contra cualquier participación activa (sin filtro de ciclo).
create or replace function public.ticket_add_auxiliary(
  p_ticket_id uuid,
  p_technician_id uuid,
  p_reason_id uuid,
  p_note text default null,
  p_client_request_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets;
  v_use public.reason_use;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.add_auxiliary');

  select * into v_ticket from public.tickets where id = p_ticket_id;
  if v_ticket.id is null then
    raise exception 'El tiquet no existe' using errcode = 'P0001';
  end if;
  if v_ticket.status in ('closed', 'rejected', 'cancelled', 'duplicate') then
    raise exception 'No se puede agregar apoyo en el estado %', v_ticket.status
      using errcode = 'P0001';
  end if;

  select use into v_use from public.reasons where id = p_reason_id;
  if v_use is distinct from 'auxiliary_support' then
    raise exception 'El motivo no es de apoyo auxiliar' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.ticket_participants
    where ticket_id = p_ticket_id and technician_id = p_technician_id
      and ended_at is null
  ) then
    raise exception 'Ese técnico ya participa en el tiquet' using errcode = '23505';
  end if;

  insert into public.ticket_participants (
    ticket_id, cycle, technician_id, participation_type, category_id, client_request_id)
  values (
    p_ticket_id, v_ticket.cycle, p_technician_id, 'auxiliary', v_ticket.category_id,
    p_client_request_id);

  perform public.write_event(
    p_ticket_id, 'auxiliary_added',
    jsonb_build_object('technician_id', p_technician_id, 'note', p_note),
    p_reason_id, null, p_technician_id, p_client_request_id);
end;
$$;
comment on function public.ticket_add_auxiliary(uuid, uuid, uuid, text, uuid) is
  'Agrega un técnico o supervisor como apoyo auxiliar del tiquet (RN-07).';
revoke execute on function public.ticket_add_auxiliary(uuid, uuid, uuid, text, uuid) from public, anon;
grant execute on function public.ticket_add_auxiliary(uuid, uuid, uuid, text, uuid) to authenticated;
