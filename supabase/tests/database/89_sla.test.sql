begin;

set search_path = extensions, public;

select plan(10);

insert into public.teams (name) values ('SLA T');
insert into public.buildings (name) values ('Edificio SLA');
insert into public.locations (building_id, name)
  select id, 'Piso S' from public.buildings where name = 'Edificio SLA';
insert into public.dependencies (name) values ('Dep SLA');
insert into public.categories (team_id, name)
  select id, 'Cat SLA' from public.teams where name = 'SLA T';
insert into public.service_types (name, target_minutes) values
  ('SLA normal', null), ('SLA rápida', 10);
insert into public.priorities (name, target_minutes) values
  ('SLA prioridad', 60), ('Sin SLA', null);
insert into public.channels (name) values ('Canal SLA');
insert into public.requesters (full_name, dependency_id)
  select 'Req SLA', d.id from public.dependencies d where d.name = 'Dep SLA';

insert into public.tickets (
  team_id, building_id, location_id, dependency_id, category_id,
  service_type_id, priority_id, channel_id, description, requester_id,
  requester_name, status, reported_at, closed_at)
select t.id, b.id, l.id, d.id, c.id, st.id, pr.id, ch.id, v.description, r.id,
  'Req SLA', 'closed', '2026-10-05 08:00:00+00', '2026-10-05 08:30:00+00'
from public.teams t, public.buildings b, public.locations l,
  public.dependencies d, public.categories c, public.service_types st,
  public.priorities pr, public.channels ch, public.requesters r,
  (values
    ('SLA A', 'SLA normal', 'SLA prioridad'),
    ('SLA B', 'SLA rápida', 'SLA prioridad'),
    ('SLA C', 'SLA normal', 'Sin SLA')
  ) as v (description, service_type, priority)
where t.name = 'SLA T' and b.name = 'Edificio SLA' and l.name = 'Piso S'
  and d.name = 'Dep SLA' and c.name = 'Cat SLA'
  and st.name = v.service_type and pr.name = v.priority
  and ch.name = 'Canal SLA' and r.full_name = 'Req SLA';

select is(
  (select target_minutes::numeric from public.v_ticket_sla where description = 'SLA A'),
  60::numeric, 'usa el objetivo de la prioridad');
select is(
  (select resolution_minutes from public.v_ticket_sla where description = 'SLA A'),
  30::numeric, 'mide la resolución en minutos');
select is(
  (select meets from public.v_ticket_sla where description = 'SLA A'),
  true, 'cumple el objetivo de la prioridad');
select is(
  (select target_minutes::numeric from public.v_ticket_sla where description = 'SLA B'),
  10::numeric, 'el tipo de servicio sobrescribe a la prioridad');
select is(
  (select meets from public.v_ticket_sla where description = 'SLA B'),
  false, 'no cumple el objetivo más estricto');
select is(
  (select target_minutes from public.v_ticket_sla where description = 'SLA C'),
  null, 'sin objetivo no hay SLA');
select is(
  (select with_target from public.v_metrics_sla),
  2::bigint, 'cuenta solo los tiquets con objetivo');
select is(
  (select met from public.v_metrics_sla),
  1::bigint, 'cuenta los cumplidos');
select is(
  (select compliance_rate from public.v_metrics_sla),
  0.5000::numeric, 'calcula la tasa de cumplimiento');
select is(
  (select compliance_rate from public.v_metrics_sla_by_priority
    where priority_name = 'SLA prioridad'),
  0.5000::numeric, 'cumplimiento por prioridad');

select * from finish();

rollback;
