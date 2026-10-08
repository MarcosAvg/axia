begin;

set search_path = extensions, public;

select plan(11);

truncate table public.tickets cascade;

-- Cuentas de prueba.
insert into auth.users (id, email, raw_user_meta_data)
select v.id, v.email, jsonb_build_object('full_name', v.full_name)
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@proxy.test', 'Admin'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor@proxy.test', 'Supervisor'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'tecnico@proxy.test', 'Técnico')
) as v (id, email, full_name);

insert into public.user_roles (user_id, role_id)
select v.uid, r.id
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'technician')
) as v (uid, role_name)
join public.roles r on r.name = v.role_name;

-- Catálogos.
insert into public.teams (name) values ('Proxy A');
insert into public.teams (name) values ('Proxy B');
insert into public.buildings (name) values ('Edificio Proxy');
insert into public.locations (building_id, name)
  select id, 'Nivel 1' from public.buildings where name = 'Edificio Proxy';
insert into public.dependencies (name) values ('Sistemas Proxy');
insert into public.categories (team_id, name)
  select id, 'Cat A' from public.teams where name = 'Proxy A';
insert into public.categories (team_id, name)
  select id, 'Cat B' from public.teams where name = 'Proxy B';
insert into public.service_types (name) values ('Correctivo Proxy');
insert into public.priorities (name) values ('Media Proxy');
insert into public.channels (name) values ('Web Proxy');
insert into public.requesters (full_name, dependency_id)
  select 'Ana Proxy', d.id from public.dependencies d where d.name = 'Sistemas Proxy';

insert into public.technicians (full_name, user_id, team_id)
  select 'Luis Proxy', '00000000-0000-0000-0000-000000000003', t.id
  from public.teams t where t.name = 'Proxy A';
insert into public.technicians (full_name, team_id)
  select 'Marta Proxy', t.id from public.teams t where t.name = 'Proxy B';

insert into public.supervisor_scopes (user_id, team_id)
  select '00000000-0000-0000-0000-000000000002', t.id
  from public.teams t where t.name = 'Proxy A';
insert into public.supervisor_scope_buildings (scope_id, building_id)
  select ss.id, b.id
  from public.supervisor_scopes ss, public.buildings b
  where ss.user_id = '00000000-0000-0000-0000-000000000002'
    and b.name = 'Edificio Proxy';

-- Dos tiquets: uno del equipo A (Luis) y otro del equipo B (Marta).
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio Proxy'),
  'location_id', (select id from public.locations where name = 'Nivel 1'),
  'dependency_id', (select id from public.dependencies where name = 'Sistemas Proxy'),
  'category_id', (select id from public.categories where name = 'Cat A'),
  'service_type_id', (select id from public.service_types where name = 'Correctivo Proxy'),
  'priority_id', (select id from public.priorities where name = 'Media Proxy'),
  'channel_id', (select id from public.channels where name = 'Web Proxy'),
  'description', 'Proxy uno',
  'requester_id', (select id from public.requesters where full_name = 'Ana Proxy')));
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio Proxy'),
  'location_id', (select id from public.locations where name = 'Nivel 1'),
  'dependency_id', (select id from public.dependencies where name = 'Sistemas Proxy'),
  'category_id', (select id from public.categories where name = 'Cat B'),
  'service_type_id', (select id from public.service_types where name = 'Correctivo Proxy'),
  'priority_id', (select id from public.priorities where name = 'Media Proxy'),
  'channel_id', (select id from public.channels where name = 'Web Proxy'),
  'description', 'Proxy dos',
  'requester_id', (select id from public.requesters where full_name = 'Ana Proxy')));

select public.ticket_assign_technician(
  (select id from public.tickets where description = 'Proxy uno'),
  (select id from public.technicians where full_name = 'Luis Proxy'));
select public.ticket_assign_technician(
  (select id from public.tickets where description = 'Proxy dos'),
  (select id from public.technicians where full_name = 'Marta Proxy'));

insert into public.evidence (ticket_id, cycle, type)
  select id, cycle, 'before' from public.tickets where description in ('Proxy uno', 'Proxy dos');

-- Administrador: puede proxy a cualquiera.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select is(
  public.can_act_on_behalf((select id from public.technicians where full_name = 'Luis Proxy')),
  true, 'el admin puede actuar en nombre de cualquier técnico');
select is(
  public.can_act_on_behalf((select id from public.technicians where full_name = 'Marta Proxy')),
  true, 'el admin puede actuar en nombre de un técnico de otro equipo');

-- Supervisor: solo sobre los técnicos de sus equipos.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select is(
  public.can_act_on_behalf((select id from public.technicians where full_name = 'Luis Proxy')),
  true, 'el supervisor puede actuar en nombre de un técnico de su equipo');
select is(
  public.can_act_on_behalf((select id from public.technicians where full_name = 'Marta Proxy')),
  false, 'el supervisor no puede actuar en nombre de un técnico ajeno');

-- El supervisor inicia a nombre de Luis (no tiene ticket.start directo).
select lives_ok(
  $$ select public.ticket_start(
       (select id from public.tickets where description = 'Proxy uno'),
       '00000000-0000-0000-0000-0000000000b1',
       (select id from public.technicians where full_name = 'Luis Proxy')) $$,
  'el supervisor inicia a nombre del técnico');
select is(
  (select status from public.tickets where description = 'Proxy uno'),
  'in_progress'::public.ticket_status, 'el tiquet queda en proceso');
select is(
  (select subject_technician_id from public.ticket_events
   where ticket_id = (select id from public.tickets where description = 'Proxy uno')
     and type = 'started' order by id desc limit 1),
  (select id from public.technicians where full_name = 'Luis Proxy'),
  'el evento registra al técnico sujeto');
select is(
  (select actor_id from public.ticket_events
   where ticket_id = (select id from public.tickets where description = 'Proxy uno')
     and type = 'started' order by id desc limit 1),
  '00000000-0000-0000-0000-000000000002'::uuid,
  'el evento registra al supervisor como actor');

-- No puede proxy sobre un técnico ajeno (mismo permiso act_on_behalf).
select throws_ok(
  $$ select public.ticket_start(
       (select id from public.tickets where description = 'Proxy dos'),
       '00000000-0000-0000-0000-0000000000b2',
       (select id from public.technicians where full_name = 'Marta Proxy')) $$,
  '42501', null, 'el supervisor no puede iniciar a nombre de un técnico ajeno');

-- Un técnico sin act_on_behalf no puede usar el proxy.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000003"}', true);
select throws_ok(
  $$ select public.ticket_start(
       (select id from public.tickets where description = 'Proxy dos'),
       '00000000-0000-0000-0000-0000000000b3',
       (select id from public.technicians where full_name = 'Marta Proxy')) $$,
  '42501', null, 'un técnico no puede actuar en nombre de otro');

-- El mismo técnico sí puede iniciar su propio tiquet sin proxy.
select lives_ok(
  $$ select public.ticket_start(
       (select id from public.tickets where description = 'Proxy dos'),
       '00000000-0000-0000-0000-0000000000b4') $$,
  'el técnico inicia su tiquet sin proxy');

select * from finish();

rollback;
