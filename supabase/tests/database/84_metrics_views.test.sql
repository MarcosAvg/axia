begin;

set search_path = extensions, public;

select plan(30);

-- Sin calendario laboral: modo laboral = modo calendario (cálculo determinista).
update public.instance_settings set default_calendar_id = null;

-- Catálogos de prueba.
insert into public.teams (name) values ('Métricas T');
insert into public.buildings (name) values ('Edificio Métricas');
insert into public.locations (building_id, name)
  select id, 'Nivel 0' from public.buildings where name = 'Edificio Métricas';
insert into public.dependencies (name) values ('Dep Métricas');
insert into public.categories (team_id, name)
  select id, 'Cat Métricas' from public.teams where name = 'Métricas T';
insert into public.service_types (name) values ('Serv Métricas');
insert into public.priorities (name) values ('Prio Métricas');
insert into public.channels (name) values ('Canal Métricas');
insert into public.requesters (full_name, dependency_id)
  select 'Req Métricas', d.id from public.dependencies d where d.name = 'Dep Métricas';
insert into public.technicians (full_name, team_id)
  select 'Téc Líder', t.id from public.teams t where t.name = 'Métricas T';
insert into public.technicians (full_name, team_id)
  select 'Téc Aux', t.id from public.teams t where t.name = 'Métricas T';
insert into public.reasons (use, name) values ('pause', 'Pausa métricas');
insert into public.reasons (use, name) values ('rejection', 'Rechazo métricas');
insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-0000000000f1', 'supervisor@metricas.test', '{}'::jsonb);

-- Tiquets.
insert into public.tickets (
  team_id, building_id, location_id, dependency_id, category_id,
  service_type_id, priority_id, channel_id, description, requester_id,
  requester_name, status, reported_at, closed_at)
select t.id, b.id, l.id, d.id, c.id, s.id, p.id, ch.id, v.description, r.id,
  'Req Métricas', v.status::public.ticket_status, v.reported, v.closed
from public.teams t, public.buildings b, public.locations l,
  public.dependencies d, public.categories c, public.service_types s,
  public.priorities p, public.channels ch, public.requesters r,
  (values
    ('T1 métricas', 'closed', '2026-10-05 08:00:00+00'::timestamptz, '2026-10-05 12:00:00+00'::timestamptz),
    ('T2 métricas', 'duplicate', '2026-10-05 08:00:00+00'::timestamptz, null),
    ('T3 métricas', 'registered', '2026-10-06 08:00:00+00'::timestamptz, null),
    ('T4 métricas', 'rejected', '2026-10-05 08:00:00+00'::timestamptz, null)
  ) as v (description, status, reported, closed)
where t.name = 'Métricas T' and b.name = 'Edificio Métricas' and l.name = 'Nivel 0'
  and d.name = 'Dep Métricas' and c.name = 'Cat Métricas' and s.name = 'Serv Métricas'
  and p.name = 'Prio Métricas' and ch.name = 'Canal Métricas' and r.full_name = 'Req Métricas';

-- Tramos de T1: trabajo 09-10, pausa 10-11 (no contable), validación 11-12.
insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at, clock_class)
  select id, 1, k.kind::public.time_span_kind, k.start_at, k.end_at, k.clock::public.clock_class
  from public.tickets,
    (values
      ('active_work', '2026-10-05 09:00:00+00'::timestamptz, '2026-10-05 10:00:00+00'::timestamptz, 'counted'),
      ('pause', '2026-10-05 10:00:00+00'::timestamptz, '2026-10-05 11:00:00+00'::timestamptz, 'not_counted'),
      ('validation', '2026-10-05 11:00:00+00'::timestamptz, '2026-10-05 12:00:00+00'::timestamptz, 'counted')
    ) as k (kind, start_at, end_at, clock)
  where description = 'T1 métricas';

-- Evidencia, recaptura, validaciones, participantes y oferta de T1.
insert into public.evidence (ticket_id, cycle, type)
  select id, 1, e.type::public.evidence_type from public.tickets,
    (values ('request'), ('before'), ('after')) as e (type)
  where description = 'T1 métricas';
insert into public.ticket_captures (ticket_id, cycle, changes)
  select id, 1, '{}'::jsonb from public.tickets where description = 'T1 métricas';
insert into public.ticket_validations (ticket_id, cycle, validator_role)
  select id, 1, v.role::text from public.tickets,
    (values ('requester'), ('supervisor')) as v (role)
  where description = 'T1 métricas';
insert into public.ticket_participants (ticket_id, cycle, technician_id, participation_type, started_at, ended_at)
  select tk.id, 1, te.id, v.type::public.participation_type, v.start_at, v.end_at
  from public.tickets tk, public.technicians te,
    (values
      ('Téc Líder', 'leader', '2026-10-05 09:00:00+00'::timestamptz, '2026-10-05 12:00:00+00'::timestamptz),
      ('Téc Aux', 'auxiliary', '2026-10-05 09:00:00+00'::timestamptz, '2026-10-05 12:00:00+00'::timestamptz)
    ) as v (tech, type, start_at, end_at)
  where tk.description = 'T1 métricas' and te.full_name = v.tech;
insert into public.ticket_offers (ticket_id, cycle, supervisor_user_id, status, offered_at, resolved_at)
  select id, 1, '00000000-0000-0000-0000-0000000000f1', 'taken',
    '2026-10-05 08:00:00+00', '2026-10-05 08:30:00+00'
  from public.tickets where description = 'T1 métricas';
insert into public.ticket_pauses (ticket_id, cycle, reason_id, opened_at, closed_at)
  select id, 1, (select id from public.reasons where name = 'Pausa métricas'),
    '2026-10-05 10:00:00+00', '2026-10-05 11:00:00+00'
  from public.tickets where description = 'T1 métricas';
insert into public.ticket_events (ticket_id, cycle, type, reason_id)
  select id, 1, 'rejected', (select id from public.reasons where name = 'Rechazo métricas')
  from public.tickets where description = 'T4 métricas';

-- Vista base.
select is(
  (select total_time from public.v_ticket_metrics_base where folio = (select folio from public.tickets where description = 'T1 métricas')),
  interval '4 hours', 'el total del tiquet es continuo');
select is(
  (select net_time from public.v_ticket_metrics_base where folio = (select folio from public.tickets where description = 'T1 métricas')),
  interval '3 hours', 'el neto excluye la pausa no contable');
select is(
  (select active_work_time from public.v_ticket_metrics_base where folio = (select folio from public.tickets where description = 'T1 métricas')),
  interval '1 hour', 'el trabajo activo es el tramo correspondiente');
select is(
  (select active_work_time_labor from public.v_ticket_metrics_base where folio = (select folio from public.tickets where description = 'T1 métricas')),
  interval '1 hour', 'sin calendario, el laboral iguala al calendario');
select is(
  (select has_request_evidence from public.v_ticket_metrics_base where folio = (select folio from public.tickets where description = 'T1 métricas')),
  true, 'marca la evidencia de solicitud');
select is(
  (select auxiliary_count from public.v_ticket_metrics_base where folio = (select folio from public.tickets where description = 'T1 métricas')),
  1::bigint, 'cuenta al auxiliar');
select is(
  (select recapture_count from public.v_ticket_metrics_base where folio = (select folio from public.tickets where description = 'T1 métricas')),
  1::bigint, 'cuenta la recaptura');

-- Agregados por dimensión (el duplicado no entra al desempeño).
select is(
  (select tickets from public.v_metrics_by_dimension
   where dimension = 'team' and dimension_id = (select id from public.teams where name = 'Métricas T')),
  3::bigint, 'la dimensión equipo excluye al duplicado');
select is(
  (select first_time_fix_rate from public.v_metrics_by_dimension
   where dimension = 'team' and dimension_id = (select id from public.teams where name = 'Métricas T')),
  1.0000::numeric, 'resolución a la primera del único cerrado');

-- Pausas por motivo.
select is(
  (select pause_time from public.v_metrics_pauses_by_reason where reason_name = 'Pausa métricas'),
  interval '1 hour', 'suma el tiempo de pausa por motivo');

-- Carga por técnico.
select is(
  (select auxiliary_count from public.v_metrics_by_technician where technician_name = 'Téc Aux'),
  1::bigint, 'cuenta las participaciones como auxiliar');
select is(
  (select leader_count from public.v_metrics_by_technician where technician_name = 'Téc Líder'),
  1::bigint, 'cuenta las participaciones como líder');

-- Duplicados por dimensión.
select is(
  (select duplicates from public.v_metrics_duplicates_by_dimension
   where dimension = 'building' and dimension_id = (select id from public.buildings where name = 'Edificio Métricas')),
  1::bigint, 'cuenta el tiquet duplicado');
select is(
  (select duplicate_rate from public.v_metrics_duplicates_by_dimension
   where dimension = 'building' and dimension_id = (select id from public.buildings where name = 'Edificio Métricas')),
  0.2500::numeric, 'calcula la tasa de duplicados');

-- Ruteo: tiempo hasta la toma.
select is(
  (select time_to_take from public.v_metrics_routing
   where folio = (select folio from public.tickets where description = 'T1 métricas')),
  interval '30 minutes', 'mide el tiempo hasta tomar la oferta');

-- Antigüedad: el tiquet registrado sigue pendiente.
select is(
  (select status from public.v_metrics_aging
   where folio = (select folio from public.tickets where description = 'T3 métricas')),
  'registered'::public.ticket_status, 'incluye los pendientes en aging');

-- Rechazos por motivo.
select is(
  (select tickets from public.v_metrics_reject_cancel_by_reason
   where event_type = 'rejected' and reason_name = 'Rechazo métricas'),
  1::bigint, 'agrupa los rechazos por motivo');

-- Funciones con filtros en el servidor. Se acotan al equipo del fixture para
-- aislarlas de los datos de la semilla.
update public.priorities set target_minutes = 120 where name = 'Prio Métricas';

select is(
  (select with_target from public.metrics_sla(
     '2026-10-05', '2026-10-05',
     p_team => (select id from public.teams where name = 'Métricas T'))),
  1::bigint, 'metrics_sla cuenta el cerrado con objetivo en el rango');
select is(
  (select met from public.metrics_sla(
     '2026-10-06', '2026-10-06',
     p_team => (select id from public.teams where name = 'Métricas T'))),
  0::bigint, 'metrics_sla excluye los tiquets fuera del rango');
select is(
  (select count(*)::int from public.metrics_sla_by_priority(
     '2026-10-05', '2026-10-05',
     p_team => (select id from public.teams where name = 'Métricas T'))),
  1, 'metrics_sla_by_priority filtra por rango');

select is(
  (select ratings from public.metrics_satisfaction(
     p_team => (select id from public.teams where name = 'Métricas T'))),
  0::bigint, 'metrics_satisfaction sin calificaciones');

select is(
  (select count(*)::int from public.metrics_by_technician(
     '2026-10-05', '2026-10-05',
     p_team => (select id from public.teams where name = 'Métricas T'))),
  2, 'metrics_by_technician filtra por rango');
select is(
  (select count(*)::int from public.metrics_by_technician(
     '2026-10-06', '2026-10-06',
     p_team => (select id from public.teams where name = 'Métricas T'))),
  0, 'metrics_by_technician vacío fuera del rango');
select is(
  (select count(*)::int from public.metrics_by_technician(
     p_dependency => (select id from public.dependencies where name = 'Dep Métricas'))),
  2, 'metrics_by_technician filtra por dependencia');

select is(
  (select tickets from public.metrics_reject_cancel_by_reason(
     '2026-10-05', '2026-10-05',
     p_team => (select id from public.teams where name = 'Métricas T'))),
  1::bigint, 'rechazos filtrados por rango');

select is(
  (select count(*)::int from public.metrics_pauses_by_reason(
     '2026-10-05', '2026-10-05',
     p_team => (select id from public.teams where name = 'Métricas T'))),
  1, 'pausas filtradas por rango');
select is(
  (select count(*)::int from public.metrics_pauses_by_reason(
     '2026-10-06', '2026-10-06',
     p_team => (select id from public.teams where name = 'Métricas T'))),
  0, 'pausas vacías fuera del rango');

select is(
  (select duplicates from public.metrics_duplicates_by_dimension(
     '2026-10-05', '2026-10-05',
     p_team => (select id from public.teams where name = 'Métricas T'))
   where dimension = 'building'),
  1::bigint, 'duplicados por dimensión filtrados por rango');

select is(
  (select sum(offers)::bigint from public.metrics_routing(
     '2026-10-05', '2026-10-05',
     p_team => (select id from public.teams where name = 'Métricas T'))),
  1::bigint, 'ruteo filtrado por rango');
select is(
  (select count(*)::int from public.metrics_duplicate_tickets(
     '2026-10-05', '2026-10-05',
     p_team => (select id from public.teams where name = 'Métricas T'))),
  1, 'tiempo hasta marcarse filtrado por rango');

select * from finish();

rollback;
