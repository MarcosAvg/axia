begin;

set search_path = extensions, public;

select plan(14);

truncate table public.tickets cascade;

-- Conjunto ficticio equivalente a una hoja con marcas de tiempo conocidas.
insert into public.teams (name) values ('Verif T');
insert into public.buildings (name) values ('Edificio Verif');
insert into public.locations (building_id, name)
  select id, 'Piso V' from public.buildings where name = 'Edificio Verif';
insert into public.dependencies (name) values ('Dep Verif');
insert into public.categories (team_id, name)
  select id, 'Cat Verif' from public.teams where name = 'Verif T';
insert into public.service_types (name) values ('Serv Verif');
insert into public.priorities (name) values ('Prio Verif');
insert into public.channels (name) values ('Canal Verif');
insert into public.requesters (full_name, dependency_id)
  select 'Req Verif', d.id from public.dependencies d where d.name = 'Dep Verif';
insert into public.reasons (use, name, clock_class)
  values ('pause', 'Pausa contable', 'counted'), ('pause', 'Pausa no contable', 'not_counted');

insert into public.tickets (
  team_id, building_id, location_id, dependency_id, category_id,
  service_type_id, priority_id, channel_id, description, requester_id,
  requester_name, status, reported_at, closed_at)
select t.id, b.id, l.id, d.id, c.id, s.id, p.id, ch.id, v.description, r.id,
  'Req Verif', v.status::public.ticket_status, v.reported, v.closed
from public.teams t, public.buildings b, public.locations l,
  public.dependencies d, public.categories c, public.service_types s,
  public.priorities p, public.channels ch, public.requesters r,
  (values
    ('Verif A', 'closed', '2026-06-01 08:00:00+00'::timestamptz, '2026-06-01 12:00:00+00'::timestamptz),
    ('Verif B', 'closed', '2026-06-01 08:00:00+00'::timestamptz, '2026-06-01 11:15:00+00'::timestamptz),
    ('Verif C', 'duplicate', '2026-06-01 08:00:00+00'::timestamptz, '2026-06-01 09:00:00+00'::timestamptz)
  ) as v (description, status, reported, closed)
where t.name = 'Verif T' and b.name = 'Edificio Verif' and l.name = 'Piso V'
  and d.name = 'Dep Verif' and c.name = 'Cat Verif' and s.name = 'Serv Verif'
  and p.name = 'Prio Verif' and ch.name = 'Canal Verif' and r.full_name = 'Req Verif';

-- Tiquet A: ciclo completo con pausa contable.
insert into public.ticket_events (ticket_id, cycle, type, occurred_at)
select id, 1, v.type::public.event_type, v.at
from public.tickets,
  (values
    ('taken', '2026-06-01 08:30:00+00'::timestamptz),
    ('assigned_technician', '2026-06-01 09:00:00+00'::timestamptz),
    ('started', '2026-06-01 09:15:00+00'::timestamptz)
  ) as v (type, at)
where description = 'Verif A';
insert into public.ticket_events (ticket_id, cycle, type, reason_id, occurred_at)
  select id, 1, 'paused', (select id from public.reasons where name = 'Pausa contable'),
    '2026-06-01 10:15:00+00'
  from public.tickets where description = 'Verif A';
insert into public.ticket_events (ticket_id, cycle, type, occurred_at)
  select id, 1, v.type::public.event_type, v.at
  from public.tickets,
    (values
      ('resumed', '2026-06-01 10:45:00+00'::timestamptz),
      ('attended', '2026-06-01 11:45:00+00'::timestamptz),
      ('validated', '2026-06-01 12:00:00+00'::timestamptz)
    ) as v (type, at)
  where description = 'Verif A';

-- Tiquet B: pausa no contable.
insert into public.ticket_events (ticket_id, cycle, type, occurred_at)
  select id, 1, 'started', '2026-06-01 09:00:00+00'
  from public.tickets where description = 'Verif B';
insert into public.ticket_events (ticket_id, cycle, type, reason_id, occurred_at)
  select id, 1, 'paused', (select id from public.reasons where name = 'Pausa no contable'),
    '2026-06-01 10:00:00+00'
  from public.tickets where description = 'Verif B';
insert into public.ticket_events (ticket_id, cycle, type, occurred_at)
  select id, 1, v.type::public.event_type, v.at
  from public.tickets,
    (values
      ('resumed', '2026-06-01 10:30:00+00'::timestamptz),
      ('attended', '2026-06-01 11:00:00+00'::timestamptz),
      ('validated', '2026-06-01 11:15:00+00'::timestamptz)
    ) as v (type, at)
  where description = 'Verif B';

-- Tiquet C: duplicado (marca de revisión), fuera de los indicadores.
insert into public.ticket_events (ticket_id, cycle, type, occurred_at)
  select id, 1, 'duplicate_marked', '2026-06-01 09:00:00+00'
  from public.tickets where description = 'Verif C';

-- Tiquet A: tramos calculados.
select is(
  public.ticket_time_by_kind((select id from public.tickets where description = 'Verif A'), 'supervisor_response'),
  interval '30 minutes', 'respuesta del supervisor');
select is(
  public.ticket_time_by_kind((select id from public.tickets where description = 'Verif A'), 'technician_assignment'),
  interval '30 minutes', 'asignación de técnico');
select is(
  public.ticket_time_by_kind((select id from public.tickets where description = 'Verif A'), 'wait_start'),
  interval '15 minutes', 'espera de inicio');
select is(
  public.ticket_time_by_kind((select id from public.tickets where description = 'Verif A'), 'active_work'),
  interval '2 hours', 'trabajo activo (excluye la pausa)');
select is(
  public.ticket_time_by_kind((select id from public.tickets where description = 'Verif A'), 'pause'),
  interval '30 minutes', 'tiempo de pausa');
select is(
  public.ticket_time_by_kind((select id from public.tickets where description = 'Verif A'), 'validation'),
  interval '15 minutes', 'validación');
select is(
  public.ticket_time_total((select id from public.tickets where description = 'Verif A')),
  interval '4 hours', 'tiempo total continuo');
select is(
  public.ticket_time_net((select id from public.tickets where description = 'Verif A')),
  interval '4 hours', 'neto sin tramos no contables');

-- Tiquet B: no contable.
select is(
  public.ticket_time_total((select id from public.tickets where description = 'Verif B')),
  interval '3 hours 15 minutes', 'total del segundo tiquet');
select is(
  public.ticket_time_net((select id from public.tickets where description = 'Verif B')),
  interval '2 hours 45 minutes', 'el neto excluye la pausa no contable');

-- Vista base: tramos del tiquet A.
select is(
  (select active_work_time from public.v_ticket_metrics_base
   where id = (select id from public.tickets where description = 'Verif A')),
  interval '2 hours', 'la vista base expone el trabajo activo');
select is(
  (select count(*)::int from public.v_ticket_metrics_base
   where id = (select id from public.tickets where description = 'Verif C')),
  0, 'el duplicado queda fuera de los indicadores');

-- Puente con la importación: el tiempo total de un importado.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000001', 'admin@verif.test', '{}'::jsonb);
insert into public.user_roles (user_id, role_id)
  select '00000000-0000-0000-0000-000000000001', id
  from public.roles where name = 'administrator';

select public.import_ticket_upsert(
  'verif', 'V-1',
  jsonb_build_object(
    'building_id', (select id from public.buildings where name = 'Edificio Verif'),
    'location_id', (select id from public.locations where name = 'Piso V'),
    'dependency_id', (select id from public.dependencies where name = 'Dep Verif'),
    'category_id', (select id from public.categories where name = 'Cat Verif'),
    'service_type_id', (select id from public.service_types where name = 'Serv Verif'),
    'priority_id', (select id from public.priorities where name = 'Prio Verif'),
    'channel_id', (select id from public.channels where name = 'Canal Verif'),
    'requester_id', (select id from public.requesters where full_name = 'Req Verif'),
    'requester_name', 'Req Verif',
    'description', 'Verif importado',
    'status', 'closed',
    'reported_at', '2026-06-02 08:00:00+00',
    'closed_at', '2026-06-02 10:00:00+00'));

select is(
  public.ticket_time_total((select id from public.tickets where description = 'Verif importado')),
  interval '2 hours', 'el importado conserva su tiempo total');

select is(
  (select count(*)::int from public.v_ticket_metrics_base),
  3, 'la base cuenta los no duplicados');

select * from finish();

rollback;
