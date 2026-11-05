-- RN §9: más eventos avisan a quien puede actuar sobre el tiquet.
-- El destinatario nunca recibe el aviso de su propia acción.

alter table public.notification_rules
  drop constraint notification_rules_recipient_check;

alter table public.notification_rules
  add constraint notification_rules_recipient_check
  check (recipient = any (array[
    'requester'::text,
    'assigned_technician'::text,
    'subject_technician'::text,
    'supervisor'::text,
    'offers'::text,
    'administrators'::text
  ]));

insert into public.notification_rules (event_type, recipient, channel) values
  ('reassigned_supervisor', 'supervisor', 'in_app'),
  ('reassigned_technician', 'assigned_technician', 'in_app'),
  ('auxiliary_added', 'subject_technician', 'in_app'),
  ('capture_recaptured', 'assigned_technician', 'in_app'),
  ('capture_recaptured', 'supervisor', 'in_app'),
  ('priority_changed', 'assigned_technician', 'in_app'),
  ('priority_changed', 'supervisor', 'in_app'),
  ('attended', 'supervisor', 'in_app'),
  ('validated', 'supervisor', 'in_app'),
  ('validated', 'assigned_technician', 'in_app'),
  ('claim_resolved', 'requester', 'in_app'),
  ('claim_resolved', 'assigned_technician', 'in_app'),
  ('reopened', 'supervisor', 'in_app'),
  ('reactivated', 'requester', 'in_app'),
  ('rated', 'assigned_technician', 'in_app')
on conflict do nothing;

create or replace function public.notify_event(p_event_id bigint) returns void
    language plpgsql security definer
    set search_path to 'public', 'extensions', 'pg_temp'
    as $$
declare
  e public.ticket_events;
  r public.notification_rules;
  v_ticket public.tickets;
  v_uid uuid;
begin
  select * into e from public.ticket_events where id = p_event_id;
  if e.id is null then return; end if;
  select * into v_ticket from public.tickets where id = e.ticket_id;

  for r in select * from public.notification_rules
           where active and event_type = e.type loop
    if r.recipient = 'requester' then
      select user_id into v_uid from public.requesters where id = v_ticket.requester_id;
      if v_uid is not null then
        if e.actor_id is null or v_uid <> e.actor_id then
          insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
          values (v_uid, e.ticket_id, e.id, e.type, r.channel, e.payload);
        end if;
      else
        insert into public.notifications (recipient_requester_id, ticket_id, event_id, type, channel, payload)
        values (v_ticket.requester_id, e.ticket_id, e.id, e.type, r.channel, e.payload);
      end if;

    elsif r.recipient = 'assigned_technician' then
      select t.user_id into v_uid
      from public.ticket_assignments a
      join public.technicians t on t.id = a.assignee_technician_id
      where a.ticket_id = e.ticket_id and a.stage = 'technician' and a.ended_at is null
      order by a.assigned_at desc limit 1;
      if v_uid is not null and (e.actor_id is null or v_uid <> e.actor_id) then
        insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
        values (v_uid, e.ticket_id, e.id, e.type, r.channel, e.payload);
      end if;

    elsif r.recipient = 'subject_technician' then
      select t.user_id into v_uid
      from public.technicians t
      where t.id = e.subject_technician_id;
      if v_uid is not null and (e.actor_id is null or v_uid <> e.actor_id) then
        insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
        values (v_uid, e.ticket_id, e.id, e.type, r.channel, e.payload);
      end if;

    elsif r.recipient = 'supervisor' then
      select assignee_user_id into v_uid from public.ticket_assignments
      where ticket_id = e.ticket_id and stage = 'supervisor' and ended_at is null
      order by assigned_at desc limit 1;
      if v_uid is not null and (e.actor_id is null or v_uid <> e.actor_id) then
        insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
        values (v_uid, e.ticket_id, e.id, e.type, r.channel, e.payload);
      end if;

    elsif r.recipient = 'offers' then
      insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
      select supervisor_user_id, e.ticket_id, e.id, e.type, r.channel, e.payload
      from public.ticket_offers
      where ticket_id = e.ticket_id and status = 'offered'
        and (e.actor_id is null or supervisor_user_id <> e.actor_id);

    elsif r.recipient = 'administrators' then
      insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
      select ur.user_id, e.ticket_id, e.id, e.type, r.channel, e.payload
      from public.user_roles ur
      join public.roles ro on ro.id = ur.role_id
      where ro.name = 'administrator'
        and (e.actor_id is null or ur.user_id <> e.actor_id);
    end if;
  end loop;
end;
$$;
