insert into public.notification_rules (event_type, recipient, channel) values
  ('offered', 'offers', 'in_app'),
  ('taken', 'requester', 'in_app'),
  ('assigned_technician', 'assigned_technician', 'in_app'),
  ('attended', 'requester', 'in_app'),
  ('claim_opened', 'supervisor', 'in_app'),
  ('reopened', 'requester', 'in_app'),
  ('rejected', 'requester', 'in_app'),
  ('cancelled', 'requester', 'in_app'),
  ('duplicate_marked', 'requester', 'in_app')
on conflict do nothing;

create or replace function public.ticket_events_broadcast()
returns trigger
language plpgsql
as $$
begin
  perform pg_notify(
    'axia_events',
    json_build_object(
      'eventId', new.id,
      'ticketId', new.ticket_id,
      'type', new.type,
      'occurredAt', new.occurred_at
    )::text
  );
  return new;
end;
$$;

drop trigger if exists ticket_events_broadcast on public.ticket_events;
create trigger ticket_events_broadcast
  after insert on public.ticket_events
  for each row execute function public.ticket_events_broadcast();
