begin;

set search_path = extensions, public;

select plan(23);

-- Tablas del tramo 3.
select has_table('public', 'tickets', 'existe public.tickets');
select has_table('public', 'ticket_events', 'existe public.ticket_events');
select has_table('public', 'ticket_assignments', 'existe public.ticket_assignments');
select has_table('public', 'ticket_participants', 'existe public.ticket_participants');
select has_table('public', 'ticket_captures', 'existe public.ticket_captures');
select has_table('public', 'evidence', 'existe public.evidence');
select has_table('public', 'idempotency_keys', 'existe public.idempotency_keys');

-- RLS activado.
select is(
  (select relrowsecurity from pg_class where oid = 'public.tickets'::regclass),
  true, 'RLS activado en tickets');
select is(
  (select relrowsecurity from pg_class where oid = 'public.ticket_events'::regclass),
  true, 'RLS activado en ticket_events');
select is(
  (select relrowsecurity from pg_class where oid = 'public.ticket_assignments'::regclass),
  true, 'RLS activado en ticket_assignments');
select is(
  (select relrowsecurity from pg_class where oid = 'public.ticket_participants'::regclass),
  true, 'RLS activado en ticket_participants');
select is(
  (select relrowsecurity from pg_class where oid = 'public.ticket_captures'::regclass),
  true, 'RLS activado en ticket_captures');
select is(
  (select relrowsecurity from pg_class where oid = 'public.evidence'::regclass),
  true, 'RLS activado en evidence');
select is(
  (select relrowsecurity from pg_class where oid = 'public.idempotency_keys'::regclass),
  true, 'RLS activado en idempotency_keys');

-- Datos de prueba.
insert into public.teams (name) values ('Mantenimiento');
insert into public.buildings (name) values ('Edificio A');
insert into public.buildings (name) values ('Edificio B');
insert into public.locations (building_id, name)
  select id, 'Planta baja' from public.buildings where name = 'Edificio A';
insert into public.dependencies (name) values ('Sistemas');
insert into public.categories (team_id, name)
  select id, 'Eléctrico' from public.teams where name = 'Mantenimiento';
insert into public.categories (team_id, name)
  select id, 'Plomería' from public.teams where name = 'Mantenimiento';
insert into public.subcategories (category_id, name)
  select id, 'Contacto' from public.categories where name = 'Eléctrico';
insert into public.problems (subcategory_id, name)
  select id, 'Chispa' from public.subcategories where name = 'Contacto';
insert into public.service_types (name) values ('Correctivo');
insert into public.priorities (name) values ('Media');
insert into public.channels (name) values ('Web');
insert into public.requesters (full_name, contact) values ('Ana Pérez', 'ext. 1');

-- Inserta un tiquet de prueba y verifica folio y consecutivo.
select lives_ok(
  $$ insert into public.tickets (
       building_id, location_id, dependency_id, category_id, subcategory_id,
       problem_id, service_type_id, priority_id, channel_id, description,
       requester_id, requester_name)
     select b.id, l.id, d.id, c.id, sc.id, p.id, st.id, pr.id, ch.id, 'Falla',
            rq.id, 'Ana Pérez'
     from public.buildings b, public.locations l, public.dependencies d,
          public.categories c, public.subcategories sc, public.problems p,
          public.service_types st, public.priorities pr, public.channels ch,
          public.requesters rq
     where b.name = 'Edificio A' and l.name = 'Planta baja' and d.name = 'Sistemas'
       and c.name = 'Eléctrico' and sc.name = 'Contacto' and p.name = 'Chispa'
       and st.name = 'Correctivo' and pr.name = 'Media' and ch.name = 'Web' $$,
  'inserta un tiquet');

select matches(
  (select folio from public.tickets limit 1),
  '^AX-[0-9]{4}-[0-9]+$', 'el folio sigue el patrón configurable');

-- Segundo tiquet: el consecutivo avanza.
insert into public.tickets (
  building_id, location_id, dependency_id, category_id, service_type_id,
  priority_id, channel_id, description, requester_id, requester_name)
select b.id, l.id, d.id, c.id, st.id, pr.id, ch.id, 'Otra', rq.id, 'Ana Pérez'
from public.buildings b, public.locations l, public.dependencies d,
     public.categories c, public.service_types st, public.priorities pr,
     public.channels ch, public.requesters rq
where b.name = 'Edificio A' and l.name = 'Planta baja' and d.name = 'Sistemas'
  and c.name = 'Eléctrico' and st.name = 'Correctivo' and pr.name = 'Media' and ch.name = 'Web';

select is(
  (select max(ticket_number) - min(ticket_number) from public.tickets),
  1::bigint, 'el consecutivo avanza de uno en uno');

-- Coherencia de clasificación.
select throws_ok(
  $$ insert into public.tickets (
       building_id, location_id, dependency_id, category_id, subcategory_id,
       service_type_id, priority_id, channel_id, description, requester_id, requester_name)
     select b.id, l.id, d.id, c.id, sc.id, st.id, pr.id, ch.id, 'x', rq.id, 'Ana'
     from public.buildings b, public.locations l, public.dependencies d,
          public.categories c, public.subcategories sc, public.service_types st,
          public.priorities pr, public.channels ch, public.requesters rq
     where b.name = 'Edificio A' and l.name = 'Planta baja' and d.name = 'Sistemas'
       and c.name = 'Plomería' and sc.name = 'Contacto' and st.name = 'Correctivo'
       and pr.name = 'Media' and ch.name = 'Web' $$,
  'P0001', null, 'rechaza una subcategoría que no pertenece a la categoría');

select throws_ok(
  $$ insert into public.tickets (
       building_id, location_id, dependency_id, category_id, service_type_id,
       priority_id, channel_id, description, requester_id, requester_name)
     select b.id, l.id, d.id, c.id, st.id, pr.id, ch.id, 'x', rq.id, 'Ana'
     from public.buildings b, public.locations l, public.dependencies d,
          public.categories c, public.service_types st, public.priorities pr,
          public.channels ch, public.requesters rq
     where b.name = 'Edificio B' and l.name = 'Planta baja' and d.name = 'Sistemas'
       and c.name = 'Eléctrico' and st.name = 'Correctivo' and pr.name = 'Media'
       and ch.name = 'Web' $$,
  'P0001', null, 'rechaza una ubicación que no pertenece al edificio');

-- Asignación de técnico exige el técnico del catálogo.
select throws_ok(
  $$ insert into public.ticket_assignments (ticket_id, cycle, stage)
     values ((select id from public.tickets limit 1), 1, 'technician') $$,
  '23514', null, 'rechaza asignación de técnico sin técnico');

-- Bitácora de solo agregar.
insert into public.ticket_events (ticket_id, cycle, type)
  values ((select id from public.tickets limit 1), 1, 'created');

select throws_ok(
  $$ update public.ticket_events set payload = '{"x":1}'::jsonb $$,
  'P0001', null, 'no permite modificar la bitácora');

-- Las evidencias no se borran.
insert into public.evidence (ticket_id, cycle, type)
  values ((select id from public.tickets limit 1), 1, 'request');

select throws_ok(
  $$ delete from public.evidence $$,
  'P0001', null, 'no permite borrar evidencias');

-- Idempotencia.
insert into public.idempotency_keys (client_request_id, operation)
  values ('00000000-0000-0000-0000-0000000000ab', 'test');

select throws_ok(
  $$ insert into public.idempotency_keys (client_request_id, operation)
     values ('00000000-0000-0000-0000-0000000000ab', 'test') $$,
  '23505', null, 'no repite una clave de idempotencia');

select * from finish();

rollback;
