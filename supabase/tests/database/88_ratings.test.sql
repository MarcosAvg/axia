begin;

set search_path = extensions, public;

-- Aísla la prueba de los tiquets y calificaciones de la semilla.
truncate table public.tickets cascade;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@rate.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'solicitante@rate.test', 'Solicitante'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'tecnico@rate.test', 'Técnico')
) as v (id, email, full_name);

insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'requester'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'technician')
) as v (uid, role_name)
join public.roles r on r.name = v.role_name;

insert into public.teams (name) values ('Rate T');
insert into public.buildings (name) values ('Edificio Rate');
insert into public.locations (building_id, name)
  select id, 'Piso R' from public.buildings where name = 'Edificio Rate';
insert into public.dependencies (name) values ('Dep Rate');
insert into public.categories (team_id, name)
  select id, 'Cat Rate' from public.teams where name = 'Rate T';
insert into public.service_types (name) values ('Serv Rate');
insert into public.priorities (name) values ('Prio Rate');
insert into public.channels (name) values ('Canal Rate');
insert into public.requesters (full_name, dependency_id, user_id)
  select 'Req Rate', d.id, '00000000-0000-0000-0000-000000000004'
  from public.dependencies d where d.name = 'Dep Rate';

insert into public.tickets (
  team_id, building_id, location_id, dependency_id, category_id,
  service_type_id, priority_id, channel_id, description, requester_id,
  requester_name, status, reported_at, closed_at)
select t.id, b.id, l.id, d.id, c.id, s.id, p.id, ch.id, v.description, r.id,
  'Req Rate', v.status::public.ticket_status, now(), v.closed
from public.teams t, public.buildings b, public.locations l,
  public.dependencies d, public.categories c, public.service_types s,
  public.priorities p, public.channels ch, public.requesters r,
  (values
    ('Rate cerrado', 'closed', now()),
    ('Rate abierto', 'assigned', null)
  ) as v (description, status, closed)
where t.name = 'Rate T' and b.name = 'Edificio Rate' and l.name = 'Piso R'
  and d.name = 'Dep Rate' and c.name = 'Cat Rate' and s.name = 'Serv Rate'
  and p.name = 'Prio Rate' and ch.name = 'Canal Rate' and r.full_name = 'Req Rate';

-- El solicitante califica su propio tiquet cerrado.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000004"}', true);
select lives_ok(
  $$ select public.ticket_rate(
       (select id from public.tickets where description = 'Rate cerrado'), 4, 'Bien') $$,
  'el solicitante califica su tiquet');
select is(
  (select score from public.ticket_ratings),
  4::smallint, 'guarda la calificación');
select is(
  (select average_score from public.v_metrics_satisfaction),
  4.000::numeric, 'el promedio de satisfacción');

-- No se califica un tiquet abierto.
select throws_ok(
  $$ select public.ticket_rate(
       (select id from public.tickets where description = 'Rate abierto'), 5) $$,
  'P0001', null, 'no califica un tiquet no cerrado');

-- La calificación debe estar entre 1 y 5.
select throws_ok(
  $$ select public.ticket_rate(
       (select id from public.tickets where description = 'Rate cerrado'), 9) $$,
  '22023', null, 'rechaza una calificación fuera de rango');

-- Un técnico sin permiso no califica a nombre del solicitante.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
select throws_ok(
  $$ select public.ticket_rate(
       (select id from public.tickets where description = 'Rate cerrado'), 3) $$,
  '42501', null, 'un técnico no califica a nombre del solicitante');

-- El administrador recalifica a nombre del solicitante (una sola por tiquet).
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select lives_ok(
  $$ select public.ticket_rate(
       (select id from public.tickets where description = 'Rate cerrado'), 5, 'Excelente') $$,
  'el admin recalifica a nombre del solicitante');
select is(
  (select count(*)::int from public.ticket_ratings),
  1, 'sigue habiendo una sola calificación por tiquet');

select * from finish();

rollback;
