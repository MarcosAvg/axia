-- Clasificación del tiquet: el tipo de servicio se define en la atención; la prioridad
-- se deriva del problema; y el canal de plataforma se marca en el catálogo.

-- 1. Tipo de servicio opcional al registrar (se captura en la atención).
alter table public.tickets alter column service_type_id drop not null;

-- 2. Prioridad por defecto del problema.
alter table public.problems
  add column default_priority_id uuid references public.priorities (id);
comment on column public.problems.default_priority_id is
  'Prioridad que hereda el tiquet al elegir este problema.';

-- 3. Canal de plataforma (el que se usa cuando el propio solicitante registra).
alter table public.channels
  add column is_platform boolean not null default false;
comment on column public.channels.is_platform is
  'Canal que representa a la plataforma; se usa al registrar desde la app.';

-- 4. Prioridad por defecto de la instancia (cuando el problema no define una).
alter table public.instance_settings
  add column default_priority_id uuid references public.priorities (id);

-- Valores tolerantes para bases ya existentes (en un reset los pone la semilla).
update public.channels set is_platform = true where name = 'Web';
update public.instance_settings
set default_priority_id = (select id from public.priorities where name = 'Media')
where default_priority_id is null;

-- 5. Alta: sin tipo de servicio, prioridad derivada y canal de plataforma si es propio.
create or replace function public.ticket_create(
  p_data jsonb,
  p_client_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to public, extensions, pg_temp
as $$
declare
  v_id uuid;
  v_requester public.requesters;
  v_on_behalf boolean := false;
  v_priority uuid;
  v_channel uuid;
begin
  if public.request_already_handled(p_client_request_id) then
    select ticket_id into v_id from public.ticket_events
      where client_request_id = p_client_request_id;
    return v_id;
  end if;

  select * into v_requester from public.requesters
    where id = (p_data ->> 'requester_id')::uuid;
  if v_requester.id is null then
    raise exception 'El solicitante no existe' using errcode = 'P0001';
  end if;

  v_on_behalf := v_requester.user_id is distinct from auth.uid();
  if v_on_behalf then
    perform public.require_permission('ticket.create_on_behalf');
  else
    perform public.require_permission('ticket.create');
  end if;

  -- Prioridad: la del problema; si no, la de la instancia; si no, la primera activa.
  select coalesce(
    (select default_priority_id from public.problems
      where id = nullif(p_data ->> 'problem_id', '')::uuid),
    (select default_priority_id from public.instance_settings limit 1),
    (select id from public.priorities where active order by position limit 1)
  ) into v_priority;

  -- Canal: a nombre de otro, el elegido; propio, el de plataforma.
  if v_on_behalf then
    v_channel := nullif(p_data ->> 'channel_id', '')::uuid;
  end if;
  v_channel := coalesce(
    v_channel,
    (select id from public.channels where is_platform and active order by name limit 1),
    (select id from public.channels where active order by name limit 1)
  );

  insert into public.tickets (
    building_id, location_id, dependency_id, category_id, subcategory_id, problem_id,
    service_type_id, priority_id, channel_id, description, requester_id, requester_name,
    requester_contact, registered_by)
  values (
    (p_data ->> 'building_id')::uuid,
    (p_data ->> 'location_id')::uuid,
    (p_data ->> 'dependency_id')::uuid,
    (p_data ->> 'category_id')::uuid,
    nullif(p_data ->> 'subcategory_id', '')::uuid,
    nullif(p_data ->> 'problem_id', '')::uuid,
    null,
    v_priority,
    v_channel,
    p_data ->> 'description',
    v_requester.id,
    v_requester.full_name,
    v_requester.contact,
    auth.uid())
  returning id into v_id;

  perform public.write_event(
    v_id, 'created', jsonb_build_object('on_behalf', v_on_behalf),
    null, null, null, p_client_request_id);

  perform public.ticket_route(v_id);
  perform public.ticket_detect_duplicates(v_id);
  return v_id;
end;
$$;
revoke execute on function public.ticket_create(jsonb, uuid) from public, anon;
grant execute on function public.ticket_create(jsonb, uuid) to authenticated;

-- 6. Atención: exige y guarda el tipo de servicio (antes de darse por atendido).
drop function if exists public.ticket_attend(uuid, text, uuid, uuid);
create or replace function public.ticket_attend(
  p_ticket_id uuid,
  p_work_description text,
  p_client_request_id uuid default null,
  p_subject_technician_id uuid default null,
  p_service_type_id uuid default null
)
returns void
language plpgsql
security definer
set search_path to public, extensions, pg_temp
as $$
declare
  v_cycle integer;
  v_service_type uuid;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_technician_action(p_ticket_id, 'ticket.attend', p_subject_technician_id);

  select cycle into v_cycle from public.tickets where id = p_ticket_id and status = 'in_progress';
  if v_cycle is null then
    raise exception 'El tiquet no está en proceso' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.evidence
    where ticket_id = p_ticket_id and cycle = v_cycle and type = 'after'
  ) then
    raise exception 'Falta la evidencia "after" del ciclo' using errcode = 'P0001';
  end if;

  v_service_type := p_service_type_id;
  if v_service_type is null then
    select service_type_id into v_service_type from public.tickets where id = p_ticket_id;
  end if;
  if v_service_type is null then
    raise exception 'Falta el tipo de servicio' using errcode = 'P0001';
  end if;

  update public.tickets
  set status = 'attended', service_type_id = v_service_type
  where id = p_ticket_id;

  perform public.write_event(
    p_ticket_id, 'attended',
    jsonb_build_object('work_description', p_work_description, 'service_type_id', v_service_type),
    null, null, p_subject_technician_id, p_client_request_id);
end;
$$;
revoke execute on function public.ticket_attend(uuid, text, uuid, uuid, uuid) from public, anon;
grant execute on function public.ticket_attend(uuid, text, uuid, uuid, uuid) to authenticated;
