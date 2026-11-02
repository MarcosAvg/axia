-- Atribución de tiempo y auditoría al sujeto proxy, no al actor.
-- Los técnicos y solicitantes pueden no tener cuenta: el catálogo es el sujeto.

alter table public.ticket_events
  add column subject_requester_id uuid references public.requesters(id);
alter table public.ticket_events
  add constraint ticket_events_one_subject check (
    num_nonnulls(subject_user_id, subject_technician_id, subject_requester_id) <= 1
  );
create index idx_ticket_events_subject_requester
  on public.ticket_events (subject_requester_id)
  where subject_requester_id is not null;

alter table public.time_spans
  add column subject_user_id uuid references public.users(id),
  add column subject_requester_id uuid references public.requesters(id);
alter table public.time_spans
  add constraint time_spans_one_subject check (
    num_nonnulls(subject_user_id, subject_technician_id, subject_requester_id) <= 1
  );
create index idx_time_spans_subject_technician
  on public.time_spans (subject_technician_id)
  where subject_technician_id is not null;
create index idx_time_spans_subject_user
  on public.time_spans (subject_user_id)
  where subject_user_id is not null;
create index idx_time_spans_subject_requester
  on public.time_spans (subject_requester_id)
  where subject_requester_id is not null;

create or replace view public.v_ticket_timeline with (security_invoker = true) as
select
  e.id,
  e.ticket_id,
  e.cycle,
  e.type,
  e.payload,
  e.occurred_at,
  e.recorded_at,
  e.actor_id,
  actor.full_name as actor_name,
  e.subject_user_id,
  subject.full_name as subject_user_name,
  e.subject_technician_id,
  technician.full_name as subject_technician_name,
  e.reason_id,
  reason.name as reason_name,
  e.subject_requester_id,
  requester.full_name as subject_requester_name
from public.ticket_events e
left join public.users actor on actor.id = e.actor_id
left join public.users subject on subject.id = e.subject_user_id
left join public.technicians technician on technician.id = e.subject_technician_id
left join public.requesters requester on requester.id = e.subject_requester_id
left join public.reasons reason on reason.id = e.reason_id;

comment on view public.v_ticket_timeline is
  'Línea de tiempo del tiquet con actor y sujeto; la visibilidad se aplica en la API.';

create or replace function public.leader_technician(
  p_ticket_id uuid,
  p_cycle integer
) returns uuid
language sql
stable
as $$
  select p.technician_id
  from public.ticket_participants p
  where p.ticket_id = p_ticket_id
    and p.cycle = p_cycle
    and p.ended_at is null
  order by
    case p.participation_type when 'leader' then 0 else 1 end,
    p.started_at desc
  limit 1;
$$;

create or replace function public.record_event_span(p_event public.ticket_events)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reported timestamptz;
  v_prev timestamptz;
  v_clock public.clock_class;
  v_technician uuid;
  v_requester uuid;
  v_supervisor uuid;
  v_policy text;
  v_role text;
  v_open_subject uuid;
begin
  select reported_at into v_reported
  from public.tickets where id = p_event.ticket_id;
  select requester_id into v_requester
  from public.tickets where id = p_event.ticket_id;
  select public.leader_technician(p_event.ticket_id, p_event.cycle)
    into v_technician;
  v_technician := coalesce(
    p_event.subject_technician_id,
    (select t.id from public.technicians t where t.user_id = p_event.actor_id),
    v_technician
  );
  select a.assignee_user_id into v_supervisor
  from public.ticket_assignments a
  where a.ticket_id = p_event.ticket_id
    and a.stage = 'supervisor'
    and a.ended_at is null
  order by a.assigned_at desc
  limit 1;
  select validation_policy into v_policy
  from public.instance_settings limit 1;
  v_policy := coalesce(v_policy, 'both');
  v_role := p_event.payload->>'role';
  if v_role is null and p_event.type = 'validated' then
    select v.validator_role into v_role
    from public.ticket_validations v
    where v.ticket_id = p_event.ticket_id
      and v.validator_user_id = p_event.actor_id
      and v.cycle = p_event.cycle
      and v.validated_at <= p_event.occurred_at
    order by v.validated_at desc
    limit 1;
  end if;

  if p_event.type = 'taken' then
    insert into public.time_spans (
      ticket_id, cycle, kind, subject_user_id, started_at, ended_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'supervisor_response',
      p_event.actor_id, v_reported, p_event.occurred_at
    );

  elsif p_event.type = 'reassigned_supervisor' then
    update public.time_spans set ended_at = p_event.occurred_at
    where ticket_id = p_event.ticket_id
      and kind in ('active_work', 'pause')
      and ended_at is null;
    select max(occurred_at) into v_prev
    from public.ticket_events
    where ticket_id = p_event.ticket_id
      and type in ('taken', 'reassigned_supervisor')
      and occurred_at < p_event.occurred_at;
    insert into public.time_spans (
      ticket_id, cycle, kind, ref_id, subject_user_id, started_at, ended_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'reassignment', p_event.reason_id,
      coalesce(p_event.subject_user_id, p_event.actor_id),
      coalesce(v_prev, v_reported), p_event.occurred_at
    );

  elsif p_event.type in ('assigned_technician', 'reassigned_technician') then
    select max(occurred_at) into v_prev
    from public.ticket_events
    where ticket_id = p_event.ticket_id
      and type = 'taken'
      and occurred_at <= p_event.occurred_at;
    insert into public.time_spans (
      ticket_id, cycle, kind, subject_technician_id, started_at, ended_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'technician_assignment',
      v_technician, coalesce(v_prev, v_reported), p_event.occurred_at
    );

  elsif p_event.type = 'started' then
    select max(occurred_at) into v_prev
    from public.ticket_events
    where ticket_id = p_event.ticket_id
      and type in ('assigned_technician', 'reassigned_technician')
      and occurred_at <= p_event.occurred_at;
    insert into public.time_spans (
      ticket_id, cycle, kind, subject_technician_id, started_at, ended_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'wait_start',
      v_technician, coalesce(v_prev, v_reported), p_event.occurred_at
    );
    insert into public.time_spans (
      ticket_id, cycle, kind, subject_technician_id, started_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'active_work',
      v_technician, p_event.occurred_at
    );

  elsif p_event.type = 'paused' then
    update public.time_spans set ended_at = p_event.occurred_at
    where ticket_id = p_event.ticket_id
      and kind = 'active_work'
      and ended_at is null;
    select clock_class into v_clock from public.reasons where id = p_event.reason_id;
    insert into public.time_spans (
      ticket_id, cycle, kind, ref_id, subject_technician_id,
      started_at, clock_class
    ) values (
      p_event.ticket_id, p_event.cycle, 'pause', p_event.reason_id,
      v_technician, p_event.occurred_at, coalesce(v_clock, 'counted')
    );

  elsif p_event.type = 'pause_advanced' then
    update public.time_spans set ended_at = p_event.occurred_at
    where ticket_id = p_event.ticket_id
      and kind = 'pause'
      and ended_at is null;
    select clock_class into v_clock from public.reasons where id = p_event.reason_id;
    insert into public.time_spans (
      ticket_id, cycle, kind, ref_id, subject_technician_id,
      started_at, clock_class
    ) values (
      p_event.ticket_id, p_event.cycle, 'pause', p_event.reason_id,
      v_technician, p_event.occurred_at, coalesce(v_clock, 'counted')
    );

  elsif p_event.type = 'resumed' then
    if p_event.reason_id is not null then
      select clock_class into v_clock from public.reasons where id = p_event.reason_id;
      update public.time_spans
      set ref_id = p_event.reason_id,
          clock_class = coalesce(v_clock, 'counted')
      where ticket_id = p_event.ticket_id
        and kind = 'pause'
        and ended_at is null;
    end if;
    update public.time_spans set ended_at = p_event.occurred_at
    where ticket_id = p_event.ticket_id
      and kind = 'pause'
      and ended_at is null;
    insert into public.time_spans (
      ticket_id, cycle, kind, subject_technician_id, started_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'active_work',
      v_technician, p_event.occurred_at
    );

  elsif p_event.type = 'evidence_added'
    and (p_event.payload->>'type') in ('before', 'during', 'after')
    and v_technician is not null then
    select ts.subject_technician_id into v_open_subject
    from public.time_spans ts
    where ts.ticket_id = p_event.ticket_id
      and ts.kind = 'active_work'
      and ts.ended_at is null
    order by ts.started_at desc
    limit 1;
    if v_open_subject is not null and v_open_subject <> v_technician then
      update public.time_spans set ended_at = p_event.occurred_at
      where ticket_id = p_event.ticket_id
        and kind = 'active_work'
        and ended_at is null;
      insert into public.time_spans (
        ticket_id, cycle, kind, subject_technician_id, started_at
      ) values (
        p_event.ticket_id, p_event.cycle, 'active_work',
        v_technician, p_event.occurred_at
      );
    end if;

  elsif p_event.type = 'attended' then
    update public.time_spans set ended_at = p_event.occurred_at
    where ticket_id = p_event.ticket_id
      and kind = 'active_work'
      and ended_at is null;
    if v_policy = 'supervisor' then
      insert into public.time_spans (
        ticket_id, cycle, kind, subject_user_id, started_at
      ) values (
        p_event.ticket_id, p_event.cycle, 'validation',
        v_supervisor, p_event.occurred_at
      );
    else
      insert into public.time_spans (
        ticket_id, cycle, kind, subject_requester_id, started_at
      ) values (
        p_event.ticket_id, p_event.cycle, 'validation',
        v_requester, p_event.occurred_at
      );
    end if;

  elsif p_event.type = 'validated' then
    if v_policy = 'both'
      and v_role = 'requester'
      and not exists (
        select 1 from public.ticket_validations v
        where v.ticket_id = p_event.ticket_id
          and v.cycle = p_event.cycle
          and v.validator_role = 'supervisor'
      ) then
      update public.time_spans set ended_at = p_event.occurred_at
      where ticket_id = p_event.ticket_id
        and kind = 'validation'
        and ended_at is null;
      insert into public.time_spans (
        ticket_id, cycle, kind, subject_user_id, started_at
      ) values (
        p_event.ticket_id, p_event.cycle, 'validation',
        v_supervisor, p_event.occurred_at
      );
    elsif v_policy = 'both'
      and v_role = 'supervisor'
      and not exists (
        select 1 from public.ticket_validations v
        where v.ticket_id = p_event.ticket_id
          and v.cycle = p_event.cycle
          and v.validator_role = 'requester'
      ) then
      update public.time_spans set ended_at = p_event.occurred_at
      where ticket_id = p_event.ticket_id
        and kind = 'validation'
        and ended_at is null;
      insert into public.time_spans (
        ticket_id, cycle, kind, subject_requester_id, started_at
      ) values (
        p_event.ticket_id, p_event.cycle, 'validation',
        v_requester, p_event.occurred_at
      );
    else
      update public.time_spans set ended_at = p_event.occurred_at
      where ticket_id = p_event.ticket_id
        and kind = 'validation'
        and ended_at is null;
    end if;

  elsif p_event.type = 'claim_opened' then
    update public.time_spans set ended_at = p_event.occurred_at
    where ticket_id = p_event.ticket_id
      and kind = 'validation'
      and ended_at is null;
    insert into public.time_spans (
      ticket_id, cycle, kind, subject_requester_id, subject_user_id,
      started_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'claim',
      case
        when p_event.subject_user_id is null
          then coalesce(p_event.subject_requester_id, v_requester)
      end,
      p_event.subject_user_id, p_event.occurred_at
    );

  elsif p_event.type in ('claim_resolved', 'reopened') then
    update public.time_spans set ended_at = p_event.occurred_at
    where ticket_id = p_event.ticket_id
      and kind = 'claim'
      and ended_at is null;

  elsif p_event.type = 'duplicate_marked' then
    insert into public.time_spans (
      ticket_id, cycle, kind, started_at, ended_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'duplicate_review',
      v_reported, p_event.occurred_at
    );
  end if;
end;
$$;

create or replace function public.ticket_events_record_spans()
returns trigger
language plpgsql
as $$
begin
  perform public.record_event_span(new);
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
  v_event public.ticket_events%rowtype;
begin
  delete from public.time_spans
  where ticket_id = p_ticket_id and origin = 'system';
  for v_event in
    select * from public.ticket_events
    where ticket_id = p_ticket_id
    order by occurred_at, id
  loop
    perform public.record_event_span(v_event);
  end loop;
end;
$$;

comment on function public.rebuild_ticket_time_spans(uuid) is
  'Reconstruye los tramos de sistema y su sujeto desde el historial de eventos.';

-- Relleno histórico: el sujeto solicitante sale del tiquet y el técnico del actor.
alter table public.ticket_events disable trigger ticket_events_no_mutation;

update public.ticket_events e
set subject_requester_id = t.requester_id
from public.tickets t
where e.ticket_id = t.id
  and e.subject_requester_id is null
  and e.subject_user_id is null
  and e.subject_technician_id is null
  and e.type in ('created', 'rated', 'claim_opened', 'cancelled');

update public.ticket_events e
set subject_requester_id = t.requester_id
from public.tickets t
where e.ticket_id = t.id
  and e.type = 'validated'
  and e.subject_requester_id is null
  and e.subject_user_id is null
  and e.subject_technician_id is null
  and coalesce(
    e.payload->>'role',
    (
      select v.validator_role
      from public.ticket_validations v
      where v.ticket_id = e.ticket_id
        and v.cycle = e.cycle
        and v.validator_user_id = e.actor_id
        and v.validated_at <= e.occurred_at
      order by v.validated_at desc
      limit 1
    ),
    ''
  ) <> 'supervisor';

update public.ticket_events e
set subject_user_id = e.actor_id
where e.type = 'validated'
  and e.subject_requester_id is null
  and e.subject_user_id is null
  and e.subject_technician_id is null
  and coalesce(
    e.payload->>'role',
    (
      select v.validator_role
      from public.ticket_validations v
      where v.ticket_id = e.ticket_id
        and v.cycle = e.cycle
        and v.validator_user_id = e.actor_id
        and v.validated_at <= e.occurred_at
      order by v.validated_at desc
      limit 1
    )
  ) = 'supervisor';

update public.ticket_events e
set subject_technician_id = t.id
from public.technicians t
where t.user_id = e.actor_id
  and e.type in (
    'started', 'paused', 'pause_advanced', 'resumed', 'attended',
    'capture_recaptured'
  )
  and e.subject_technician_id is null
  and e.subject_user_id is null
  and e.subject_requester_id is null;

update public.ticket_events e
set subject_technician_id = t.id
from public.technicians t
where t.user_id = e.actor_id
  and e.type = 'evidence_added'
  and e.payload->>'type' in ('before', 'during', 'after')
  and e.subject_technician_id is null
  and e.subject_user_id is null
  and e.subject_requester_id is null;

alter table public.ticket_events enable trigger ticket_events_no_mutation;

do $$
declare
  v_ticket record;
begin
  for v_ticket in select id from public.tickets loop
    perform public.rebuild_ticket_time_spans(v_ticket.id);
  end loop;
end;
$$;
