-- Fase 3, tramo 1: evidencia en Storage y RPC que completan el flujo de operación.
-- Diseño: docs/modelo-datos.md §4 (matriz de transiciones) y §6 (duplicados). ADR 0017.

-- 1. Evidencia en almacenamiento privado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence', 'evidence', false, 20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

-- Convención de ruta: tickets/<ticket_id>/<ciclo>/<archivo>.
create policy evidence_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = 'tickets'
    and public.can_see_ticket(((storage.foldername(name))[2])::uuid)
  );

create policy evidence_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = 'tickets'
    and public.can_see_ticket(((storage.foldername(name))[2])::uuid)
  );

-- Registra la evidencia de un tiquet y la liga a su evento (idempotente).
create or replace function public.evidence_add(
  p_ticket_id uuid,
  p_type public.evidence_type,
  p_storage_path text,
  p_mime_type text default null,
  p_size_bytes bigint default null,
  p_occurred_at timestamptz default now(),
  p_client_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cycle integer;
  v_id uuid;
  v_event_id bigint;
begin
  if p_client_request_id is not null then
    select id into v_id from public.evidence where client_request_id = p_client_request_id;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if p_storage_path is null or btrim(p_storage_path) = '' then
    raise exception 'La ruta del archivo es obligatoria' using errcode = '22023';
  end if;

  select cycle into v_cycle from public.tickets where id = p_ticket_id;
  if v_cycle is null then
    raise exception 'El tiquet no existe' using errcode = 'P0001';
  end if;
  if not public.can_see_ticket(p_ticket_id) then
    raise exception 'No puedes agregar evidencia a ese tiquet' using errcode = '42501';
  end if;

  insert into public.evidence (
    ticket_id, cycle, type, storage_path, mime_type, size_bytes,
    captured_by_user_id, uploaded_by, occurred_at, client_request_id)
  values (
    p_ticket_id, v_cycle, p_type, p_storage_path, p_mime_type, p_size_bytes,
    auth.uid(), auth.uid(), p_occurred_at, p_client_request_id)
  returning id into v_id;

  perform public.write_event(
    p_ticket_id, 'evidence_added',
    jsonb_build_object('evidence_id', v_id, 'type', p_type, 'storage_path', p_storage_path),
    null, null, null, null);

  select id into v_event_id from public.ticket_events
    where ticket_id = p_ticket_id order by id desc limit 1;
  update public.evidence set event_id = v_event_id where id = v_id;

  return v_id;
end;
$$;
comment on function public.evidence_add is
  'Registra una evidencia (archivo ya subido a Storage) y la liga a su evento.';
revoke execute on function public.evidence_add from public, anon;
grant execute on function public.evidence_add to authenticated;

-- 2. Reasignar supervisor (RN-06): a otro equipo o a un supervisor concreto.
create or replace function public.ticket_assign_supervisor(
  p_ticket_id uuid,
  p_reason_id uuid,
  p_supervisor_user_id uuid default null,
  p_team_id uuid default null,
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
  v_is_holder boolean;
  v_is_admin boolean;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;
  perform public.require_permission('ticket.assign_supervisor');

  select * into v_ticket from public.tickets where id = p_ticket_id;
  if v_ticket.id is null then
    raise exception 'El tiquet no existe' using errcode = 'P0001';
  end if;
  if v_ticket.status not in ('with_supervisor', 'assigned', 'paused', 'in_progress') then
    raise exception 'No se puede reasignar el tiquet en el estado %', v_ticket.status
      using errcode = 'P0001';
  end if;

  select use into v_use from public.reasons where id = p_reason_id;
  if v_use is distinct from 'supervisor_reassignment' then
    raise exception 'El motivo no es de reasignación de supervisor' using errcode = '22023';
  end if;

  -- Solo quien tiene el tiquet o un administrador (ámbito 'all').
  select exists (
    select 1 from public.ticket_assignments
    where ticket_id = p_ticket_id and stage = 'supervisor'
      and assignee_user_id = auth.uid() and ended_at is null
  ) into v_is_holder;
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = auth.uid()
      and rp.permission_id = 'ticket.assign_supervisor' and rp.scope = 'all'
  ) into v_is_admin;
  if not v_is_holder and not v_is_admin then
    raise exception 'Solo quien tiene el tiquet puede reasignarlo' using errcode = '42501';
  end if;

  if (p_supervisor_user_id is null) = (p_team_id is null) then
    raise exception 'Indica un supervisor o un equipo (exactamente uno)' using errcode = '22023';
  end if;

  -- Cierra la asignación de supervisor vigente y retira ofertas abiertas.
  update public.ticket_assignments set ended_at = now()
    where ticket_id = p_ticket_id and stage = 'supervisor' and ended_at is null;
  update public.ticket_offers set status = 'withdrawn', resolved_at = now()
    where ticket_id = p_ticket_id and status = 'offered';

  if p_supervisor_user_id is not null then
    update public.tickets set status = 'with_supervisor' where id = p_ticket_id;
    insert into public.ticket_assignments (
      ticket_id, cycle, stage, assignee_user_id, assigned_by, reason_id, note)
    values (p_ticket_id, v_ticket.cycle, 'supervisor', p_supervisor_user_id,
            auth.uid(), p_reason_id, p_note);
    perform public.write_event(
      p_ticket_id, 'reassigned_supervisor',
      jsonb_build_object('to_supervisor', p_supervisor_user_id, 'note', p_note),
      p_reason_id, p_supervisor_user_id, null, p_client_request_id);
  else
    update public.tickets set team_id = p_team_id, status = 'registered' where id = p_ticket_id;
    perform public.ticket_route(p_ticket_id);
    perform public.write_event(
      p_ticket_id, 'reassigned_supervisor',
      jsonb_build_object('to_team', p_team_id, 'note', p_note),
      p_reason_id, null, null, p_client_request_id);
  end if;
end;
$$;
comment on function public.ticket_assign_supervisor is
  'Reasigna el tiquet a otro equipo (re-rutea) o a un supervisor concreto (RN-06).';
revoke execute on function public.ticket_assign_supervisor from public, anon;
grant execute on function public.ticket_assign_supervisor to authenticated;

-- 3. Agregar apoyo auxiliar (RN-07).
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
    where ticket_id = p_ticket_id and cycle = v_ticket.cycle
      and technician_id = p_technician_id and ended_at is null
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
comment on function public.ticket_add_auxiliary is
  'Agrega un técnico o supervisor como apoyo auxiliar del tiquet (RN-07).';
revoke execute on function public.ticket_add_auxiliary from public, anon;
grant execute on function public.ticket_add_auxiliary to authenticated;

-- 4. Pre-chequeo de posibles duplicados (RN-29), sin crear el tiquet.
create or replace function public.ticket_check_duplicates(p_data jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_window interval;
  v_similarity numeric;
  v_fields text[];
  v_building uuid := (p_data ->> 'building_id')::uuid;
  v_problem uuid := (p_data ->> 'problem_id')::uuid;
  v_category uuid := (p_data ->> 'category_id')::uuid;
  v_description text := coalesce(p_data ->> 'description', '');
begin
  perform public.require_permission('ticket.create');

  select duplicate_window, duplicate_similarity, duplicate_shown_fields
    into v_window, v_similarity, v_fields
  from public.instance_settings limit 1;

  return coalesce((
    select jsonb_agg(shown order by similarity desc)
    from (
      select
        extensions.similarity(t.description, v_description) as similarity,
        (
          select jsonb_object_agg(e.key, e.value)
          from jsonb_each(jsonb_build_object(
            'folio', t.folio,
            'status', t.status,
            'reported_at', t.reported_at,
            'building', b.name,
            'problem', pr.name,
            'requester_contact', t.requester_contact
          )) as e(key, value)
          where e.key = any(v_fields)
        ) as shown
      from public.tickets t
      left join public.buildings b on b.id = t.building_id
      left join public.problems pr on pr.id = t.problem_id
      where t.status not in ('closed', 'rejected', 'cancelled', 'duplicate')
        and t.building_id = v_building
        and (t.problem_id is not distinct from v_problem or t.category_id = v_category)
        and t.reported_at > now() - v_window
        and extensions.similarity(t.description, v_description) >= v_similarity
    ) candidates
  ), '[]'::jsonb);
end;
$$;
comment on function public.ticket_check_duplicates is
  'Candidatos a duplicado al registrar; no crea el tiquet (RN-29).';
revoke execute on function public.ticket_check_duplicates from public, anon;
grant execute on function public.ticket_check_duplicates to authenticated;

-- 5. La reasignación de supervisor también genera su tramo de tiempo (§7).
create or replace function public.ticket_events_record_spans()
returns trigger
language plpgsql
as $$
declare
  v_reported timestamptz;
  v_prev timestamptz;
  v_clock public.clock_class;
begin
  select reported_at into v_reported from public.tickets where id = new.ticket_id;

  if new.type = 'taken' then
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'supervisor_response', v_reported, new.occurred_at);

  elsif new.type = 'reassigned_supervisor' then
    select max(occurred_at) into v_prev from public.ticket_events
      where ticket_id = new.ticket_id
        and type in ('taken', 'reassigned_supervisor') and occurred_at < new.occurred_at;
    insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'reassignment', new.reason_id,
            coalesce(v_prev, v_reported), new.occurred_at);

  elsif new.type = 'assigned_technician' then
    select max(occurred_at) into v_prev from public.ticket_events
      where ticket_id = new.ticket_id and type = 'taken';
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'technician_assignment',
            coalesce(v_prev, v_reported), new.occurred_at);

  elsif new.type = 'started' then
    select max(occurred_at) into v_prev from public.ticket_events
      where ticket_id = new.ticket_id and type = 'assigned_technician';
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'wait_start', coalesce(v_prev, v_reported), new.occurred_at);
    insert into public.time_spans (ticket_id, cycle, kind, started_at)
    values (new.ticket_id, new.cycle, 'active_work', new.occurred_at);

  elsif new.type = 'paused' then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'active_work' and ended_at is null;
    select clock_class into v_clock from public.reasons where id = new.reason_id;
    insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, clock_class)
    values (new.ticket_id, new.cycle, 'pause', new.reason_id, new.occurred_at,
            coalesce(v_clock, 'counted'));

  elsif new.type = 'resumed' then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'pause' and ended_at is null;
    insert into public.time_spans (ticket_id, cycle, kind, started_at)
    values (new.ticket_id, new.cycle, 'active_work', new.occurred_at);

  elsif new.type = 'attended' then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'active_work' and ended_at is null;
    insert into public.time_spans (ticket_id, cycle, kind, started_at)
    values (new.ticket_id, new.cycle, 'validation', new.occurred_at);

  elsif new.type = 'validated' then
    if (select status from public.tickets where id = new.ticket_id) = 'closed' then
      update public.time_spans set ended_at = new.occurred_at
        where ticket_id = new.ticket_id and kind = 'validation' and ended_at is null;
    end if;

  elsif new.type = 'claim_opened' then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'validation' and ended_at is null;
    insert into public.time_spans (ticket_id, cycle, kind, started_at)
    values (new.ticket_id, new.cycle, 'claim', new.occurred_at);

  elsif new.type in ('claim_resolved', 'reopened') then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'claim' and ended_at is null;

  elsif new.type = 'duplicate_marked' then
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'duplicate_review', v_reported, new.occurred_at);
  end if;

  return new;
end;
$$;

-- 6. Los participantes auxiliares también ven el tiquet (se corrige el ámbito de lectura).
create or replace function public.can_see_ticket(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tickets t
    where t.id = p_ticket_id
      and public.has_permission(auth.uid(), 'ticket.view')
      and (
        exists (
          select 1 from public.user_roles ur
          join public.role_permissions rp on rp.role_id = ur.role_id
          where ur.user_id = auth.uid()
            and rp.permission_id = 'ticket.view' and rp.scope = 'all'
        )
        or exists (
          select 1 from public.requesters r
          where r.id = t.requester_id and r.user_id = auth.uid()
        )
        or exists (
          select 1 from public.ticket_assignments a
          join public.technicians te on te.id = a.assignee_technician_id
          where a.ticket_id = t.id and a.ended_at is null and te.user_id = auth.uid()
        )
        or exists (
          select 1 from public.ticket_participants tp
          join public.technicians te on te.id = tp.technician_id
          where tp.ticket_id = t.id and tp.ended_at is null and te.user_id = auth.uid()
        )
        or exists (
          select 1 from public.ticket_assignments a
          where a.ticket_id = t.id and a.ended_at is null and a.assignee_user_id = auth.uid()
        )
        or exists (
          select 1 from public.supervisor_scopes ss
          join public.supervisor_scope_buildings ssb on ssb.scope_id = ss.id
          where ss.user_id = auth.uid() and ss.team_id = t.team_id
            and ssb.building_id = t.building_id
        )
      )
  );
$$;
comment on function public.can_see_ticket(uuid) is
  'Verdadero si el usuario puede ver el tiquet según su permiso y ámbito (RN-23).';
revoke execute on function public.can_see_ticket(uuid) from public, anon;
grant execute on function public.can_see_ticket(uuid) to authenticated;
