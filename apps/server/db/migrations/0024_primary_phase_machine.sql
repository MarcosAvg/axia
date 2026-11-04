-- Una sola fase primaria abierta por tiquet. Reasignación, recaptura y
-- revisión de duplicado quedan como anotaciones y no suman en la barra.

create or replace function public.phase_kind_for_status(
  p_status public.ticket_status
) returns public.time_span_kind
language sql
immutable
as $$
  select case p_status
    when 'registered' then 'pending_take'::public.time_span_kind
    when 'with_supervisor' then 'technician_assignment'::public.time_span_kind
    when 'assigned' then 'wait_start'::public.time_span_kind
    when 'in_progress' then 'active_work'::public.time_span_kind
    when 'paused' then 'pause'::public.time_span_kind
    when 'attended' then 'validation'::public.time_span_kind
    when 'under_claim' then 'claim'::public.time_span_kind
  end;
$$;

comment on function public.phase_kind_for_status(public.ticket_status) is
  'Fase primaria que corresponde al estado actual del tiquet.';

create or replace function public.close_primary_phase(
  p_ticket_id uuid,
  p_at timestamptz
) returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.time_spans
  set ended_at = greatest(p_at, started_at)
  where ticket_id = p_ticket_id
    and ended_at is null
    and voided_at is null
    and kind in (
      'supervisor_response', 'pending_take', 'technician_assignment',
      'wait_start', 'active_work', 'pause', 'validation', 'claim'
    );
$$;

comment on function public.close_primary_phase(uuid, timestamptz) is
  'Cierra la fase primaria abierta; no toca anotaciones.';

create or replace function public.previous_phase_end(p_ticket_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select max(ts.ended_at)
  from public.time_spans ts
  where ts.ticket_id = p_ticket_id
    and ts.voided_at is null
    and ts.ended_at is not null
    and ts.kind in (
      'supervisor_response', 'pending_take', 'technician_assignment',
      'wait_start', 'active_work', 'pause', 'validation', 'claim'
    );
$$;

comment on function public.previous_phase_end(uuid) is
  'Último instante cubierto por una fase primaria cerrada.';

create or replace function public.open_phase_for_status(
  p_ticket_id uuid,
  p_status public.ticket_status,
  p_at timestamptz,
  p_reason_id uuid default null,
  p_cycle integer default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cycle integer;
  v_requester uuid;
  v_kind public.time_span_kind;
  v_technician uuid;
  v_supervisor uuid;
  v_requester_validated boolean;
  v_policy text;
  v_clock public.clock_class := 'counted';
  v_subject_user uuid;
  v_subject_technician uuid;
  v_subject_requester uuid;
  v_ref uuid;
begin
  select t.cycle, t.requester_id into v_cycle, v_requester
  from public.tickets t where t.id = p_ticket_id;
  if not found then return; end if;
  v_cycle := coalesce(p_cycle, v_cycle);

  v_kind := public.phase_kind_for_status(p_status);
  if v_kind is null then
    perform public.close_primary_phase(p_ticket_id, p_at);
    return;
  end if;

  select a.assignee_user_id into v_supervisor
  from public.ticket_assignments a
  where a.ticket_id = p_ticket_id
    and a.stage = 'supervisor'
    and a.ended_at is null
  order by a.assigned_at desc
  limit 1;

  v_technician := public.leader_technician(p_ticket_id, v_cycle);
  select validation_policy into v_policy
  from public.instance_settings limit 1;
  v_policy := coalesce(v_policy, 'both');

  if v_kind = 'technician_assignment' then
    v_subject_user := v_supervisor;
  elsif v_kind in ('wait_start', 'active_work', 'pause') then
    v_subject_technician := v_technician;
  elsif v_kind = 'validation' then
    if v_policy = 'supervisor' then
      v_subject_user := v_supervisor;
    elsif v_policy = 'requester' then
      v_subject_requester := v_requester;
    else
      select exists (
        select 1 from public.ticket_validations tv
        where tv.ticket_id = p_ticket_id
          and tv.cycle = v_cycle
          and tv.validator_role = 'requester'
      ) into v_requester_validated;
      if v_requester_validated then
        v_subject_user := v_supervisor;
      else
        v_subject_requester := v_requester;
      end if;
    end if;
  elsif v_kind = 'claim' then
    v_subject_requester := v_requester;
  end if;

  if v_kind = 'pause' then
    v_ref := coalesce(
      p_reason_id,
      (
        select ts.ref_id
        from public.time_spans ts
        where ts.ticket_id = p_ticket_id
          and ts.kind = 'pause'
          and ts.ref_id is not null
        order by ts.started_at desc
        limit 1
      )
    );
    select r.clock_class into v_clock
    from public.reasons r where r.id = v_ref;
    v_clock := coalesce(v_clock, 'counted');
  end if;

  perform public.close_primary_phase(p_ticket_id, p_at);

  insert into public.time_spans (
    ticket_id, cycle, kind, ref_id, started_at, clock_class,
    subject_user_id, subject_technician_id, subject_requester_id
  ) values (
    p_ticket_id, v_cycle, v_kind, v_ref, p_at, v_clock,
    v_subject_user, v_subject_technician, v_subject_requester
  );
end;
$$;

comment on function public.open_phase_for_status(uuid, public.ticket_status, timestamptz, uuid, integer) is
  'Abre la fase primaria que corresponde a un estado, resolviendo ciclo, sujeto y motivo.';

create or replace function public.record_event_span(
  p_event public.ticket_events
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reported timestamptz;
  v_cycle integer;
  v_requester uuid;
  v_technician uuid;
  v_supervisor uuid;
  v_policy text;
  v_role text;
  v_clock public.clock_class;
  v_open_subject uuid;
  v_open_id uuid;
  v_open_kind public.time_span_kind;
  v_open_exists boolean;
  v_start timestamptz;
  v_prev timestamptz;
  v_status public.ticket_status;
  v_reason uuid;
begin
  select t.reported_at, t.cycle, t.requester_id, t.status
  into v_reported, v_cycle, v_requester, v_status
  from public.tickets t where t.id = p_event.ticket_id;
  if not found then return; end if;

  select a.assignee_user_id into v_supervisor
  from public.ticket_assignments a
  where a.ticket_id = p_event.ticket_id
    and a.stage = 'supervisor'
    and a.ended_at is null
  order by a.assigned_at desc
  limit 1;

  v_technician := coalesce(
    p_event.subject_technician_id,
    (select t.id from public.technicians t where t.user_id = p_event.actor_id),
    public.leader_technician(p_event.ticket_id, p_event.cycle)
  );
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

  if p_event.type = 'created' then
    return;
  end if;

  if p_event.type = 'taken' then
    update public.time_spans
    set subject_user_id = p_event.actor_id, ended_at = p_event.occurred_at
    where ticket_id = p_event.ticket_id
      and kind = 'supervisor_response'
      and ended_at is null;
    perform public.close_primary_phase(
      p_event.ticket_id, p_event.occurred_at
    );
    insert into public.time_spans (
      ticket_id, cycle, kind, subject_user_id, started_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'technician_assignment',
      p_event.actor_id, p_event.occurred_at
    );

  elsif p_event.type in ('assigned_technician', 'reassigned_technician') then
    select ts.id, ts.kind into v_open_id, v_open_kind
    from public.time_spans ts
    where ts.ticket_id = p_event.ticket_id
      and ts.ended_at is null
      and ts.voided_at is null
      and ts.kind in (
        'supervisor_response', 'pending_take', 'technician_assignment',
        'wait_start', 'active_work', 'pause', 'validation', 'claim'
      )
    order by ts.started_at desc
    limit 1;

    if v_open_kind = 'technician_assignment' then
      update public.time_spans
      set subject_user_id = null,
          subject_technician_id = v_technician,
          ended_at = greatest(p_event.occurred_at, started_at)
      where id = v_open_id;
    elsif p_event.type = 'assigned_technician' and v_open_id is not null then
      update public.time_spans
      set kind = 'technician_assignment',
          subject_user_id = null,
          subject_technician_id = v_technician,
          ended_at = greatest(p_event.occurred_at, started_at)
      where id = v_open_id;
    else
      perform public.close_primary_phase(
        p_event.ticket_id, p_event.occurred_at
      );
    end if;

    insert into public.time_spans (
      ticket_id, cycle, kind, subject_technician_id, started_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'wait_start',
      v_technician, p_event.occurred_at
    );

  elsif p_event.type = 'started' then
    perform public.close_primary_phase(
      p_event.ticket_id, p_event.occurred_at
    );
    insert into public.time_spans (
      ticket_id, cycle, kind, subject_technician_id, started_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'active_work',
      v_technician, p_event.occurred_at
    );

  elsif p_event.type in ('paused', 'pause_advanced') then
    select r.clock_class into v_clock
    from public.reasons r where r.id = p_event.reason_id;
    perform public.close_primary_phase(
      p_event.ticket_id, p_event.occurred_at
    );
    insert into public.time_spans (
      ticket_id, cycle, kind, ref_id, subject_technician_id,
      started_at, clock_class
    ) values (
      p_event.ticket_id, p_event.cycle, 'pause', p_event.reason_id,
      v_technician, p_event.occurred_at, coalesce(v_clock, 'counted')
    );

  elsif p_event.type = 'resumed' then
    if p_event.reason_id is not null then
      select r.clock_class into v_clock
      from public.reasons r where r.id = p_event.reason_id;
      update public.time_spans
      set ref_id = p_event.reason_id,
          clock_class = coalesce(v_clock, 'counted')
      where ticket_id = p_event.ticket_id
        and kind = 'pause'
        and ended_at is null;
    end if;
    perform public.close_primary_phase(
      p_event.ticket_id, p_event.occurred_at
    );
    insert into public.time_spans (
      ticket_id, cycle, kind, subject_technician_id, started_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'active_work',
      v_technician, p_event.occurred_at
    );

  elsif p_event.type = 'attended' then
    perform public.close_primary_phase(
      p_event.ticket_id, p_event.occurred_at
    );
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
          and v.validated_at <= p_event.occurred_at
      ) then
      perform public.close_primary_phase(
        p_event.ticket_id, p_event.occurred_at
      );
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
          and v.validated_at <= p_event.occurred_at
      ) then
      perform public.close_primary_phase(
        p_event.ticket_id, p_event.occurred_at
      );
      insert into public.time_spans (
        ticket_id, cycle, kind, subject_requester_id, started_at
      ) values (
        p_event.ticket_id, p_event.cycle, 'validation',
        v_requester, p_event.occurred_at
      );
    else
      perform public.close_primary_phase(
        p_event.ticket_id, p_event.occurred_at
      );
    end if;

  elsif p_event.type = 'claim_opened' then
    select exists (
      select 1 from public.time_spans ts
      where ts.ticket_id = p_event.ticket_id
        and ts.ended_at is null
        and ts.voided_at is null
        and ts.kind in (
          'supervisor_response', 'pending_take', 'technician_assignment',
          'wait_start', 'active_work', 'pause', 'validation', 'claim'
        )
    ) into v_open_exists;
    perform public.close_primary_phase(
      p_event.ticket_id, p_event.occurred_at
    );
    v_start := case
      when v_open_exists then p_event.occurred_at
      else coalesce(
        public.previous_phase_end(p_event.ticket_id),
        p_event.occurred_at
      )
    end;
    insert into public.time_spans (
      ticket_id, cycle, kind, subject_requester_id, subject_user_id,
      started_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'claim',
      case
        when p_event.subject_user_id is null
          then coalesce(p_event.subject_requester_id, v_requester)
      end,
      p_event.subject_user_id, v_start
    );

  elsif p_event.type in ('claim_resolved', 'reopened') then
    perform public.close_primary_phase(
      p_event.ticket_id, p_event.occurred_at
    );
    if p_event.type = 'reopened' then
      insert into public.time_spans (
        ticket_id, cycle, kind, subject_technician_id, started_at
      ) values (
        p_event.ticket_id, p_event.cycle, 'wait_start',
        v_technician, p_event.occurred_at
      );
    elsif p_event.payload->>'resolution' = 'new_ticket' then
      perform public.open_phase_for_status(
        p_event.ticket_id,
        coalesce(
          (
            select c.prior_status::public.ticket_status
            from public.ticket_claims c
            where c.ticket_id = p_event.ticket_id
            order by c.opened_at desc
            limit 1
          ),
          v_status
        ),
        p_event.occurred_at,
        null,
        p_event.cycle
      );
    end if;

  elsif p_event.type in ('rejected', 'cancelled') then
    perform public.close_primary_phase(
      p_event.ticket_id, p_event.occurred_at
    );

  elsif p_event.type = 'duplicate_marked' then
    perform public.close_primary_phase(
      p_event.ticket_id, p_event.occurred_at
    );
    insert into public.time_spans (
      ticket_id, cycle, kind, started_at, ended_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'duplicate_review',
      v_reported, p_event.occurred_at
    );

  elsif p_event.type = 'reassigned_supervisor' then
    select max(e.occurred_at) into v_prev
    from public.ticket_events e
    where e.ticket_id = p_event.ticket_id
      and e.type in ('taken', 'reassigned_supervisor')
      and e.occurred_at < p_event.occurred_at;
    insert into public.time_spans (
      ticket_id, cycle, kind, ref_id, subject_user_id, started_at, ended_at
    ) values (
      p_event.ticket_id, p_event.cycle, 'reassignment', p_event.reason_id,
      coalesce(p_event.subject_user_id, p_event.actor_id),
      coalesce(v_prev, v_reported), p_event.occurred_at
    );
    perform public.close_primary_phase(
      p_event.ticket_id, p_event.occurred_at
    );
    if p_event.payload ? 'toSupervisor' then
      insert into public.time_spans (
        ticket_id, cycle, kind, subject_user_id, started_at
      ) values (
        p_event.ticket_id, p_event.cycle, 'technician_assignment',
        (p_event.payload->>'toSupervisor')::uuid, p_event.occurred_at
      );
    else
      insert into public.time_spans (
        ticket_id, cycle, kind, started_at
      ) values (
        p_event.ticket_id, p_event.cycle, 'pending_take', p_event.occurred_at
      );
    end if;

  elsif p_event.type = 'reactivated' then
    perform public.close_primary_phase(
      p_event.ticket_id, p_event.occurred_at
    );
    perform public.open_phase_for_status(
      p_event.ticket_id,
      coalesce(
        (p_event.payload->>'to')::public.ticket_status,
        v_status
      ),
      coalesce(
        public.previous_phase_end(p_event.ticket_id),
        p_event.occurred_at
      ),
      null,
      p_event.cycle
    );

  elsif p_event.type = 'capture_recaptured' then
    if p_event.payload ? 'teamId' or p_event.payload ? 'buildingId' then
      perform public.close_primary_phase(
        p_event.ticket_id, p_event.occurred_at
      );
      perform public.open_phase_for_status(
        p_event.ticket_id, 'registered', p_event.occurred_at,
        null, p_event.cycle
      );
    elsif p_event.payload ? 'categoryId' then
      select ts.kind into v_open_kind
      from public.time_spans ts
      where ts.ticket_id = p_event.ticket_id
        and ts.ended_at is null
        and ts.voided_at is null
        and ts.kind in (
          'supervisor_response', 'pending_take', 'technician_assignment',
          'wait_start', 'active_work', 'pause', 'validation', 'claim'
        )
      order by ts.started_at desc
      limit 1;
      perform public.close_primary_phase(
        p_event.ticket_id, p_event.occurred_at
      );
      perform public.open_phase_for_status(
        p_event.ticket_id,
        case v_open_kind
          when 'technician_assignment' then 'with_supervisor'::public.ticket_status
          when 'wait_start' then 'assigned'::public.ticket_status
          when 'active_work' then 'in_progress'::public.ticket_status
          when 'pause' then 'paused'::public.ticket_status
          when 'validation' then 'attended'::public.ticket_status
          when 'claim' then 'under_claim'::public.ticket_status
          else 'registered'::public.ticket_status
        end,
        p_event.occurred_at,
        null,
        p_event.cycle
      );
    end if;

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
      perform public.close_primary_phase(
        p_event.ticket_id, p_event.occurred_at
      );
      insert into public.time_spans (
        ticket_id, cycle, kind, subject_technician_id, started_at
      ) values (
        p_event.ticket_id, p_event.cycle, 'active_work',
        v_technician, p_event.occurred_at
      );
    end if;
  end if;
end;
$$;

comment on function public.record_event_span(public.ticket_events) is
  'Deriva la fase primaria y las anotaciones de un evento.';

create or replace function public.tickets_open_initial_phase()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.time_spans (ticket_id, cycle, kind, started_at)
  values (new.id, new.cycle, 'supervisor_response', new.reported_at);
  return new;
end;
$$;

drop trigger if exists tickets_open_initial_phase on public.tickets;
create trigger tickets_open_initial_phase
  after insert on public.tickets
  for each row execute function public.tickets_open_initial_phase();

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

comment on function public.rebuild_ticket_time_spans(uuid) is
  'Reconstruye fases primarias y anotaciones desde el historial de eventos.';

do $$
declare
  v_ticket record;
begin
  for v_ticket in select id from public.tickets loop
    perform public.rebuild_ticket_time_spans(v_ticket.id);
  end loop;
end;
$$;

create or replace view public.v_ticket_phase_coverage
with (security_invoker = 'true') as
select
  t.id,
  t.status,
  coalesce(t.closed_at, now()) - t.reported_at as total_time,
  coalesce(p.phase_time, interval '0') as phase_time,
  coalesce(t.closed_at, now()) - t.reported_at
    - coalesce(p.phase_time, interval '0') as delta
from public.tickets t
left join lateral (
  select sum(
    greatest(
      least(coalesce(ts.ended_at, t.closed_at, now()), coalesce(t.closed_at, now()))
        - greatest(ts.started_at, t.reported_at),
      interval '0'
    )
  ) as phase_time
  from public.time_spans ts
  where ts.ticket_id = t.id
    and ts.voided_at is null
    and ts.kind in (
      'supervisor_response', 'pending_take', 'technician_assignment',
      'wait_start', 'active_work', 'pause', 'validation', 'claim'
    )
) p on true;

comment on view public.v_ticket_phase_coverage is
  'Cobertura por tiquet: tiempo total, suma de fases primarias y diferencia.';

create unique index time_spans_one_open_phase
  on public.time_spans (ticket_id)
  where ended_at is null
    and voided_at is null
    and kind in (
      'supervisor_response', 'pending_take', 'technician_assignment',
      'wait_start', 'active_work', 'pause', 'validation', 'claim'
    );
