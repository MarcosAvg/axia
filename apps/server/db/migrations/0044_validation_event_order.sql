-- La atribución del segundo tramo de validación sigue el orden de eventos,
-- no la hora registrada en ticket_validations.

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
    join public.ticket_events e on e.id = v.event_id
    where v.ticket_id = p_event.ticket_id
      and v.validator_user_id = p_event.actor_id
      and v.cycle = p_event.cycle
      and (e.occurred_at, e.id) <= (p_event.occurred_at, p_event.id)
    order by e.occurred_at desc, e.id desc
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
        select 1 from public.ticket_events e
        where e.ticket_id = p_event.ticket_id
          and e.cycle = p_event.cycle
          and e.type = 'validated'
          and e.payload->>'role' = 'supervisor'
          and (e.occurred_at, e.id) < (p_event.occurred_at, p_event.id)
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
        select 1 from public.ticket_events e
        where e.ticket_id = p_event.ticket_id
          and e.cycle = p_event.cycle
          and e.type = 'validated'
          and e.payload->>'role' = 'requester'
          and (e.occurred_at, e.id) < (p_event.occurred_at, p_event.id)
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
