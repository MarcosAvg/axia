-- RN-03: un tiquet sin supervisores candidatos avisa a administración.
insert into public.notification_rules (event_type, recipient, channel)
values ('unrouted', 'administrators', 'in_app')
on conflict do nothing;
