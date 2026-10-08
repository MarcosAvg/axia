begin;

set search_path = extensions, public;

select plan(6);

truncate table public.tickets cascade;

insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000001', 'admin@tl.test', '{}'::jsonb);
insert into public.user_roles (user_id, role_id)
  select '00000000-0000-0000-0000-000000000001', id
  from public.roles where name = 'administrator';

insert into public.teams (name) values ('Tl T');
insert into public.buildings (name) values ('Edificio Tl');
insert into public.locations (building_id, name)
  select id, 'Piso L' from public.buildings where name = 'Edificio Tl';
insert into public.dependencies (name) values ('Dep Tl');
insert into public.categories (team_id, name)
  select id, 'Cat Tl' from public.teams where name = 'Tl T';
insert into public.service_types (name) values ('Serv Tl');
insert into public.priorities (name) values ('Prio Tl');
insert into public.channels (name) values ('Canal Tl');
insert into public.requesters (full_name, dependency_id)
  select 'Req Tl', d.id from public.dependencies d where d.name = 'Dep Tl';

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);

select public.import_ticket_upsert(
  'historia', 'H-1',
  jsonb_build_object(
    'building_id', (select id from public.buildings where name = 'Edificio Tl'),
    'location_id', (select id from public.locations where name = 'Piso L'),
    'dependency_id', (select id from public.dependencies where name = 'Dep Tl'),
    'category_id', (select id from public.categories where name = 'Cat Tl'),
    'service_type_id', (select id from public.service_types where name = 'Serv Tl'),
    'priority_id', (select id from public.priorities where name = 'Prio Tl'),
    'channel_id', (select id from public.channels where name = 'Canal Tl'),
    'requester_id', (select id from public.requesters where full_name = 'Req Tl'),
    'requester_name', 'Req Tl',
    'description', 'Historia importada',
    'status', 'closed',
    'reported_at', '2026-06-03 08:00:00+00'));

select public.import_ticket_timeline(
  (select id from public.tickets where description = 'Historia importada'),
  '2026-06-03 08:00:00+00',
  '2026-06-03 09:00:00+00',
  '2026-06-03 12:00:00+00',
  '2026-06-03 12:00:00+00');

select is(
  public.ticket_time_by_kind(
    (select id from public.tickets where description = 'Historia importada'),
    'technician_assignment'),
  interval '1 hour', 'atención = reporte a asignación');
select is(
  public.ticket_time_by_kind(
    (select id from public.tickets where description = 'Historia importada'),
    'active_work'),
  interval '3 hours', 'trabajo = asignación a finalización');
select is(
  public.ticket_time_total(
    (select id from public.tickets where description = 'Historia importada')),
  interval '4 hours', 'total = reporte a finalización');
select is(
  public.ticket_time_by_kind(
    (select id from public.tickets where description = 'Historia importada'),
    'wait_start'),
  interval '0', 'sin espera de inicio (asignación = inicio)');
select is(
  (select source from public.ticket_events
    where ticket_id = (select id from public.tickets where description = 'Historia importada')
      and type = 'created'),
  'import'::public.event_source, 'el evento sintético queda marcado como importado');

-- Idempotente.
select public.import_ticket_timeline(
  (select id from public.tickets where description = 'Historia importada'),
  '2026-06-03 08:00:00+00', '2026-06-03 09:00:00+00',
  '2026-06-03 12:00:00+00', '2026-06-03 12:00:00+00');
select is(
  (select count(*)::int from public.ticket_events
    where ticket_id = (select id from public.tickets where description = 'Historia importada')
      and type = 'assigned_technician'),
  1, 'reconstruir dos veces no duplica');

select * from finish();

rollback;
