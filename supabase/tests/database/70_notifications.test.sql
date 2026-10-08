begin;

set search_path = extensions, public;

select plan(13);

select has_table('public', 'notification_rules', 'existe public.notification_rules');
select has_table('public', 'notifications', 'existe public.notifications');
select has_table('public', 'escalation_rules', 'existe public.escalation_rules');
select is(
  (select relrowsecurity from pg_class where oid = 'public.notification_rules'::regclass),
  true, 'RLS activado en notification_rules');
select is(
  (select relrowsecurity from pg_class where oid = 'public.notifications'::regclass),
  true, 'RLS activado en notifications');
select is(
  (select relrowsecurity from pg_class where oid = 'public.escalation_rules'::regclass),
  true, 'RLS activado en escalation_rules');
select cmp_ok((select count(*)::int from public.notification_rules), '>', 0,
  'se sembraron reglas de notificación');
select cmp_ok((select count(*)::int from public.escalation_rules), '>', 0,
  'se sembraron reglas de escalamiento');

-- Fixtures.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004');
insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-000000000001', 'Admin'),
  ('00000000-0000-0000-0000-000000000002', 'Supervisor'),
  ('00000000-0000-0000-0000-000000000003', 'Técnico'),
  ('00000000-0000-0000-0000-000000000004', 'Solicitante');
insert into public.user_roles (user_id, role_id)
select v.uid, r.id from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'administrator'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'supervisor'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'technician'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'requester')
) as v (uid, role_name) join public.roles r on r.name = v.role_name;
insert into public.teams (name) values ('Mantenimiento');
insert into public.buildings (name) values ('Edificio A');
insert into public.locations (building_id, name)
  select id, 'Planta baja' from public.buildings where name = 'Edificio A';
insert into public.dependencies (name) values ('Sistemas');
insert into public.categories (team_id, name)
  select id, 'Eléctrico' from public.teams where name = 'Mantenimiento';
insert into public.service_types (name) values ('Correctivo');
insert into public.priorities (name) values ('Media');
insert into public.channels (name) values ('Web');
insert into public.requesters (full_name, contact, dependency_id, user_id)
  select 'Ana Pérez', 'ext. 1', d.id, '00000000-0000-0000-0000-000000000004'
  from public.dependencies d where d.name = 'Sistemas';
insert into public.technicians (full_name, user_id, team_id)
  select 'Luis Gómez', '00000000-0000-0000-0000-000000000003', t.id
  from public.teams t where t.name = 'Mantenimiento';
insert into public.supervisor_scopes (user_id, team_id)
  select '00000000-0000-0000-0000-000000000002', t.id
  from public.teams t where t.name = 'Mantenimiento';
insert into public.supervisor_scope_buildings (scope_id, building_id)
  select ss.id, b.id from public.supervisor_scopes ss, public.buildings b
  where ss.user_id = '00000000-0000-0000-0000-000000000002' and b.name = 'Edificio A';

-- Registrar, tomar y asignar.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
select public.ticket_create(jsonb_build_object(
  'building_id', (select id from public.buildings where name = 'Edificio A'),
  'location_id', (select id from public.locations where name = 'Planta baja'),
  'dependency_id', (select id from public.dependencies where name = 'Sistemas'),
  'category_id', (select id from public.categories where name = 'Eléctrico'),
  'service_type_id', (select id from public.service_types where name = 'Correctivo'),
  'priority_id', (select id from public.priorities where name = 'Media'),
  'channel_id', (select id from public.channels where name = 'Web'),
  'description', 'Falla',
  'requester_id', (select id from public.requesters where full_name = 'Ana Pérez')));

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002"}', true);
select public.ticket_take((select id from public.tickets order by ticket_number limit 1));
select public.ticket_assign_technician(
  (select id from public.tickets order by ticket_number limit 1),
  (select id from public.technicians where full_name = 'Luis Gómez'));

-- Notificaciones encoladas por las reglas.
select ok(
  exists (select 1 from public.notifications
          where recipient_user_id = '00000000-0000-0000-0000-000000000002'
            and type = 'offered'),
  'notifica la oferta al supervisor candidato');
select ok(
  exists (select 1 from public.notifications
          where recipient_user_id = '00000000-0000-0000-0000-000000000004'
            and type = 'taken'),
  'notifica al solicitante que tomaron el tiquet');
select ok(
  exists (select 1 from public.notifications
          where recipient_user_id = '00000000-0000-0000-0000-000000000003'
            and type = 'assigned_technician'),
  'notifica al técnico asignado');

-- Marcar como leída.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000004"}', true);
select lives_ok(
  $$ select public.notification_mark_read(
       (select id from public.notifications
        where recipient_user_id = '00000000-0000-0000-0000-000000000004' limit 1)) $$,
  'el destinatario marca su notificación como leída');
select is(
  (select count(*)::int from public.notifications
   where recipient_user_id = '00000000-0000-0000-0000-000000000004' and read_at is not null),
  1, 'la notificación queda como leída');

select * from finish();

rollback;
