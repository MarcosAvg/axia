begin;

set search_path = extensions, public;

-- Aísla la prueba de los tiquets de la semilla (agregados globales).
truncate table public.tickets cascade;

select plan(4);

insert into public.teams (name) values ('Dup T');
insert into public.buildings (name) values ('Edificio Dup');
insert into public.locations (building_id, name)
  select id, 'Piso D' from public.buildings where name = 'Edificio Dup';
insert into public.dependencies (name) values ('Dep Dup');
insert into public.categories (team_id, name)
  select id, 'Cat Dup' from public.teams where name = 'Dup T';
insert into public.service_types (name) values ('Serv Dup');
insert into public.priorities (name) values ('Prio Dup');
insert into public.channels (name) values ('Canal Dup');
insert into public.requesters (full_name, dependency_id)
  select 'Req Dup', d.id from public.dependencies d where d.name = 'Dep Dup';

insert into public.tickets (
  team_id, building_id, location_id, dependency_id, category_id,
  service_type_id, priority_id, channel_id, description, requester_id,
  requester_name, status, reported_at)
select t.id, b.id, l.id, d.id, c.id, s.id, p.id, ch.id, v.description, r.id,
  'Req Dup', v.status::public.ticket_status, v.reported
from public.teams t, public.buildings b, public.locations l,
  public.dependencies d, public.categories c, public.service_types s,
  public.priorities p, public.channels ch, public.requesters r,
  (values
    ('Dup marcado', 'duplicate', '2026-10-05 08:00:00+00'::timestamptz),
    ('Dup candidato a', 'closed', '2026-10-04 08:00:00+00'::timestamptz),
    ('Dup candidato b', 'closed', '2026-10-03 08:00:00+00'::timestamptz)
  ) as v (description, status, reported)
where t.name = 'Dup T' and b.name = 'Edificio Dup' and l.name = 'Piso D'
  and d.name = 'Dep Dup' and c.name = 'Cat Dup' and s.name = 'Serv Dup'
  and p.name = 'Prio Dup' and ch.name = 'Canal Dup' and r.full_name = 'Req Dup';

insert into public.ticket_events (ticket_id, cycle, type, occurred_at)
  select id, 1, 'duplicate_marked', '2026-10-05 10:00:00+00'
  from public.tickets where description = 'Dup marcado';

insert into public.ticket_duplicate_candidates (ticket_id, candidate_ticket_id, similarity, decision)
  select (select id from public.tickets where description = 'Dup marcado'), id, 0.9, v.decision
  from public.tickets,
    (values ('Dup candidato a', 'ignored'), ('Dup candidato b', 'linked')) as v (description, decision)
  where public.tickets.description = v.description;

select is(
  (select count(*)::int from public.v_metrics_duplicate_tickets),
  1, 'cuenta el tiquet duplicado');
select is(
  (select time_to_mark from public.v_metrics_duplicate_tickets),
  interval '2 hours', 'mide el tiempo hasta marcarse');
select is(
  (select candidates from public.v_metrics_duplicate_alerts where decision = 'ignored'),
  1::bigint, 'cuenta las alertas ignoradas');
select is(
  (select candidates from public.v_metrics_duplicate_alerts where decision = 'linked'),
  1::bigint, 'cuenta las alertas atendidas (enlazadas)');

select * from finish();

rollback;
