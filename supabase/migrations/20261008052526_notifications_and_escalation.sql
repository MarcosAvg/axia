-- Tramo 7 de la Fase 1: notificaciones, reglas y escalamiento.
-- Diseño: docs/modelo-datos.md §3.5. En esta fase solo se registran; el envío real (push,
-- correo) se construye después.

create type public.notification_channel as enum ('in_app', 'email', 'push', 'sms');
create type public.escalation_condition as enum (
  'untaken', 'unassigned', 'no_candidate', 'target_near', 'target_overdue'
);

create table public.notification_rules (
  id uuid primary key default gen_random_uuid(),
  event_type public.event_type not null,
  recipient text not null check (recipient in (
    'requester', 'assigned_technician', 'supervisor', 'offers', 'administrators')),
  channel public.notification_channel not null default 'in_app',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (event_type, recipient, channel)
);
comment on table public.notification_rules is
  'Reglas configurables: tipo de evento → destinatario → canal (RN §9).';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references auth.users (id) on delete cascade,
  recipient_requester_id uuid references public.requesters (id) on delete cascade,
  ticket_id uuid references public.tickets (id) on delete cascade,
  event_id bigint references public.ticket_events (id),
  type public.event_type not null,
  channel public.notification_channel not null default 'in_app',
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (recipient_user_id is not null or recipient_requester_id is not null)
);
comment on table public.notifications is
  'Notificaciones por destinatario. Para contactos sin cuenta queda "para el contacto".';

create table public.escalation_rules (
  id uuid primary key default gen_random_uuid(),
  condition public.escalation_condition not null,
  threshold interval not null,
  notify text not null default 'supervisor',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (condition)
);
comment on table public.escalation_rules is
  'Reglas de escalamiento (RN-21). El disparo programado llega después.';

create index idx_notifications_recipient on public.notifications (recipient_user_id, read_at);
create index idx_notifications_ticket on public.notifications (ticket_id);

alter table public.notification_rules enable row level security;
alter table public.notifications enable row level security;
alter table public.escalation_rules enable row level security;

-- Ruteo con evento 'offered' (así las notificaciones de oferta ven las ofertas ya creadas).
create or replace function public.ticket_route(p_ticket_id uuid)
returns void
language plpgsql
as $$
declare
  v_ticket public.tickets;
  v_inserted integer;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id;
  insert into public.ticket_offers (ticket_id, cycle, supervisor_user_id)
  select v_ticket.id, v_ticket.cycle, ss.user_id
  from public.supervisor_scopes ss
  join public.supervisor_scope_buildings ssb on ssb.scope_id = ss.id
  where ss.team_id = v_ticket.team_id
    and ssb.building_id = v_ticket.building_id
    and ss.active
    and exists (select 1 from public.profiles pr where pr.id = ss.user_id and pr.active)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    perform public.write_event(p_ticket_id, 'offered', '{}'::jsonb, null, null, null, null);
  end if;
end;
$$;

-- Encola notificaciones a partir de un evento, según las reglas activas.
create or replace function public.notify_event(p_event_id bigint)
returns void
language plpgsql
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
        insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
        values (v_uid, e.ticket_id, e.id, e.type, r.channel, e.payload);
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
      if v_uid is not null then
        insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
        values (v_uid, e.ticket_id, e.id, e.type, r.channel, e.payload);
      end if;

    elsif r.recipient = 'supervisor' then
      select assignee_user_id into v_uid from public.ticket_assignments
      where ticket_id = e.ticket_id and stage = 'supervisor' and ended_at is null
      order by assigned_at desc limit 1;
      if v_uid is not null then
        insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
        values (v_uid, e.ticket_id, e.id, e.type, r.channel, e.payload);
      end if;

    elsif r.recipient = 'offers' then
      insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
      select supervisor_user_id, e.ticket_id, e.id, e.type, r.channel, e.payload
      from public.ticket_offers
      where ticket_id = e.ticket_id and status = 'offered';

    elsif r.recipient = 'administrators' then
      insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
      select ur.user_id, e.ticket_id, e.id, e.type, r.channel, e.payload
      from public.user_roles ur
      join public.roles ro on ro.id = ur.role_id
      where ro.name = 'administrator';
    end if;
  end loop;
end;
$$;

create or replace function public.ticket_events_notify()
returns trigger
language plpgsql
as $$
begin
  perform public.notify_event(new.id);
  return new;
end;
$$;

create trigger ticket_events_notify
  after insert on public.ticket_events
  for each row execute function public.ticket_events_notify();

-- Marcar una notificación como leída.
create or replace function public.notification_mark_read(p_notification_id uuid)
returns void
language plpgsql
as $$
begin
  update public.notifications
  set read_at = now()
  where id = p_notification_id
    and (recipient_user_id = auth.uid() or recipient_user_id is null);
  if not found then
    raise exception 'No puedes marcar esa notificación' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.notification_mark_read(uuid) from public;
grant execute on function public.notification_mark_read(uuid) to authenticated;
