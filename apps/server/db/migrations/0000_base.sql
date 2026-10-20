-- Axia base schema. Generated from the cleaned legacy schema and reviewed for the
-- self-hosted stack. Hosted-platform auth, RLS, object storage and flow RPCs are
-- intentionally absent.

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: assignment_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assignment_stage AS ENUM (
    'supervisor',
    'technician'
);


--
-- Name: claim_resolution; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.claim_resolution AS ENUM (
    'upheld',
    'dismissed',
    'new_ticket'
);


--
-- Name: claim_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.claim_status AS ENUM (
    'open',
    'resolved'
);


--
-- Name: clock_class; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.clock_class AS ENUM (
    'counted',
    'not_counted'
);


--
-- Name: escalation_condition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.escalation_condition AS ENUM (
    'untaken',
    'unassigned',
    'no_candidate',
    'target_near',
    'target_overdue'
);


--
-- Name: event_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_source AS ENUM (
    'app',
    'import',
    'integration'
);


--
-- Name: event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_type AS ENUM (
    'created',
    'offered',
    'taken',
    'reassigned_supervisor',
    'assigned_technician',
    'reassigned_technician',
    'auxiliary_added',
    'capture_recaptured',
    'started',
    'paused',
    'pause_advanced',
    'resumed',
    'attended',
    'validated',
    'claim_opened',
    'claim_resolved',
    'reopened',
    'rejected',
    'cancelled',
    'duplicate_marked',
    'reactivated',
    'priority_changed',
    'comment',
    'evidence_added',
    'imported',
    'manual_time_recorded',
    'rated'
);


--
-- Name: evidence_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.evidence_type AS ENUM (
    'request',
    'before',
    'during',
    'after',
    'claim',
    'other'
);


--
-- Name: link_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.link_type AS ENUM (
    'duplicate_of',
    'derived_from',
    'related_to',
    'blocked_by'
);


--
-- Name: notification_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_channel AS ENUM (
    'in_app',
    'push'
);


--
-- Name: offer_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.offer_status AS ENUM (
    'offered',
    'taken',
    'withdrawn'
);


--
-- Name: participation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.participation_type AS ENUM (
    'leader',
    'auxiliary'
);


--
-- Name: permission_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.permission_scope AS ENUM (
    'own',
    'team',
    'buildings',
    'all'
);


--
-- Name: reason_use; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reason_use AS ENUM (
    'pause',
    'rejection',
    'cancellation',
    'supervisor_reassignment',
    'technician_reassignment',
    'recapture',
    'claim',
    'claim_outcome',
    'reactivation',
    'auxiliary_support'
);


--
-- Name: span_origin; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.span_origin AS ENUM (
    'system',
    'manual'
);


--
-- Name: ticket_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_status AS ENUM (
    'registered',
    'with_supervisor',
    'assigned',
    'in_progress',
    'paused',
    'attended',
    'under_claim',
    'closed',
    'rejected',
    'cancelled',
    'duplicate'
);


--
-- Name: time_span_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.time_span_kind AS ENUM (
    'supervisor_response',
    'reassignment',
    'technician_assignment',
    'recapture',
    'wait_start',
    'active_work',
    'pause',
    'validation',
    'claim',
    'duplicate_review'
);


--
-- Name: metrics_by_technician(date, date, uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metrics_by_technician(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_building uuid DEFAULT NULL::uuid, p_team uuid DEFAULT NULL::uuid, p_category uuid DEFAULT NULL::uuid, p_dependency uuid DEFAULT NULL::uuid) RETURNS TABLE(technician_id uuid, technician_name text, tickets bigint, leader_count bigint, auxiliary_count bigint, participation_time interval, participation_time_labor interval, participation_time_extra interval, assigned_count bigint)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select
    p.technician_id,
    tech.full_name,
    count(distinct p.ticket_id),
    count(*) filter (where p.participation_type = 'leader'),
    count(*) filter (where p.participation_type = 'auxiliary'),
    sum(coalesce(p.ended_at, now()) - p.started_at),
    sum(public.work_calendar_overlap(
      public.ticket_calendar(p.ticket_id),
      p.started_at,
      coalesce(p.ended_at, now()))),
    sum(coalesce(p.ended_at, now()) - p.started_at)
      - sum(public.work_calendar_overlap(
          public.ticket_calendar(p.ticket_id),
          p.started_at,
          coalesce(p.ended_at, now()))),
    (select count(*)
       from public.ticket_assignments a
       join public.tickets ta on ta.id = a.ticket_id
      where a.assignee_technician_id = p.technician_id
        and a.stage = 'technician'
        and public.metrics_date_in(ta.reported_at, p_from, p_to)
        and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
          ta.building_id, ta.team_id, ta.category_id, ta.dependency_id))
  from public.ticket_participants p
  join public.technicians tech on tech.id = p.technician_id
  join public.tickets t on t.id = p.ticket_id
  where public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id)
  group by p.technician_id, tech.full_name
  order by count(distinct p.ticket_id) desc;
$$;


--
-- Name: FUNCTION metrics_by_technician(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.metrics_by_technician(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid) IS 'Carga por técnico y horas de apoyo, filtrada.';


--
-- Name: metrics_date_in(timestamp with time zone, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metrics_date_in(p_at timestamp with time zone, p_from date, p_to date) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  select (p_from is null or (p_at at time zone 'UTC')::date >= p_from)
     and (p_to is null or (p_at at time zone 'UTC')::date <= p_to);
$$;


--
-- Name: FUNCTION metrics_date_in(p_at timestamp with time zone, p_from date, p_to date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.metrics_date_in(p_at timestamp with time zone, p_from date, p_to date) IS 'Verdadero si el día (UTC) del instante cae dentro del rango opcional.';


--
-- Name: metrics_dims_in(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metrics_dims_in(p_building uuid, p_team uuid, p_category uuid, p_dependency uuid, t_building uuid, t_team uuid, t_category uuid, t_dependency uuid) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  select (p_building is null or t_building = p_building)
     and (p_team is null or t_team = p_team)
     and (p_category is null or t_category = p_category)
     and (p_dependency is null or t_dependency = p_dependency);
$$;


--
-- Name: FUNCTION metrics_dims_in(p_building uuid, p_team uuid, p_category uuid, p_dependency uuid, t_building uuid, t_team uuid, t_category uuid, t_dependency uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.metrics_dims_in(p_building uuid, p_team uuid, p_category uuid, p_dependency uuid, t_building uuid, t_team uuid, t_category uuid, t_dependency uuid) IS 'Verdadero si el tiquet coincide con las dimensiones pedidas (cada una opcional).';


--
-- Name: metrics_duplicate_alerts(date, date, uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metrics_duplicate_alerts(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_building uuid DEFAULT NULL::uuid, p_team uuid DEFAULT NULL::uuid, p_category uuid DEFAULT NULL::uuid, p_dependency uuid DEFAULT NULL::uuid) RETURNS TABLE(decision text, candidates bigint, tickets bigint)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select coalesce(c.decision, 'pending'), count(*), count(distinct c.ticket_id)
  from public.ticket_duplicate_candidates c
  join public.tickets t on t.id = c.ticket_id
  where public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id)
  group by coalesce(c.decision, 'pending');
$$;


--
-- Name: FUNCTION metrics_duplicate_alerts(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.metrics_duplicate_alerts(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid) IS 'Candidatos de posible duplicado por decisión, filtrados.';


--
-- Name: metrics_duplicate_tickets(date, date, uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metrics_duplicate_tickets(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_building uuid DEFAULT NULL::uuid, p_team uuid DEFAULT NULL::uuid, p_category uuid DEFAULT NULL::uuid, p_dependency uuid DEFAULT NULL::uuid) RETURNS TABLE(time_to_mark interval)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select min(e.occurred_at) - t.reported_at
  from public.tickets t
  left join public.ticket_events e
    on e.ticket_id = t.id and e.type = 'duplicate_marked'
  where t.status = 'duplicate'
    and public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id)
  group by t.id, t.reported_at;
$$;


--
-- Name: FUNCTION metrics_duplicate_tickets(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.metrics_duplicate_tickets(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid) IS 'Tiquets duplicados con el tiempo desde el registro hasta marcarse, filtrado.';


--
-- Name: metrics_duplicates_by_dimension(date, date, uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metrics_duplicates_by_dimension(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_building uuid DEFAULT NULL::uuid, p_team uuid DEFAULT NULL::uuid, p_category uuid DEFAULT NULL::uuid, p_dependency uuid DEFAULT NULL::uuid) RETURNS TABLE(dimension text, dimension_id uuid, dimension_name text, tickets bigint, duplicates bigint, duplicate_rate numeric)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  with base as (
    select
      t.team_id,
      t.building_id,
      t.category_id,
      t.dependency_id,
      t.requester_id,
      t.status
    from public.tickets t
    where public.metrics_date_in(t.reported_at, p_from, p_to)
      and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
        t.building_id, t.team_id, t.category_id, t.dependency_id)
  ),
  agg as (
    select
      grouping(b.team_id) as g_team,
      grouping(b.building_id) as g_building,
      grouping(b.category_id) as g_category,
      grouping(b.dependency_id) as g_dependency,
      b.team_id,
      b.building_id,
      b.category_id,
      b.dependency_id,
      b.requester_id,
      count(*) as tickets,
      count(*) filter (where b.status = 'duplicate') as duplicates
    from base b
    group by grouping sets (
      (b.team_id), (b.building_id), (b.category_id), (b.dependency_id), (b.requester_id)
    )
  )
  select
    case
      when agg.g_team = 0 then 'team'
      when agg.g_building = 0 then 'building'
      when agg.g_category = 0 then 'category'
      when agg.g_dependency = 0 then 'dependency'
      else 'requester'
    end,
    coalesce(agg.team_id, agg.building_id, agg.category_id, agg.dependency_id, agg.requester_id),
    coalesce(tm.name, bld.name, cat.name, dep.name, req.full_name),
    agg.tickets,
    agg.duplicates,
    round(agg.duplicates::numeric / nullif(agg.tickets, 0), 4)
  from agg
  left join public.teams tm on tm.id = agg.team_id
  left join public.buildings bld on bld.id = agg.building_id
  left join public.categories cat on cat.id = agg.category_id
  left join public.dependencies dep on dep.id = agg.dependency_id
  left join public.requesters req on req.id = agg.requester_id;
$$;


--
-- Name: FUNCTION metrics_duplicates_by_dimension(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.metrics_duplicates_by_dimension(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid) IS 'Tasa de duplicados por equipo, edificio, categoría, dependencia y solicitante, filtrada.';


--
-- Name: metrics_pauses_by_reason(date, date, uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metrics_pauses_by_reason(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_building uuid DEFAULT NULL::uuid, p_team uuid DEFAULT NULL::uuid, p_category uuid DEFAULT NULL::uuid, p_dependency uuid DEFAULT NULL::uuid) RETURNS TABLE(reason_name text, pauses bigint, pause_time interval, pause_time_labor interval)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select
    r.name,
    count(*),
    sum(coalesce(p.closed_at, now()) - p.opened_at),
    sum(public.work_calendar_overlap(
      public.ticket_calendar(p.ticket_id),
      p.opened_at,
      coalesce(p.closed_at, now())))
  from public.ticket_pauses p
  join public.reasons r on r.id = p.reason_id
  join public.tickets t on t.id = p.ticket_id
  where public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id)
  group by r.name
  order by count(*) desc;
$$;


--
-- Name: FUNCTION metrics_pauses_by_reason(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.metrics_pauses_by_reason(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid) IS 'Pausas por motivo con su tiempo, filtradas.';


--
-- Name: metrics_reject_cancel_by_reason(date, date, uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metrics_reject_cancel_by_reason(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_building uuid DEFAULT NULL::uuid, p_team uuid DEFAULT NULL::uuid, p_category uuid DEFAULT NULL::uuid, p_dependency uuid DEFAULT NULL::uuid) RETURNS TABLE(event_type text, reason_name text, tickets bigint)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select e.type::text, r.name, count(*)
  from public.ticket_events e
  join public.reasons r on r.id = e.reason_id
  join public.tickets t on t.id = e.ticket_id
  where e.type in ('rejected', 'cancelled')
    and public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id)
  group by e.type, r.name
  order by count(*) desc;
$$;


--
-- Name: FUNCTION metrics_reject_cancel_by_reason(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.metrics_reject_cancel_by_reason(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid) IS 'Rechazos y cancelaciones agrupados por motivo, filtrados.';


--
-- Name: metrics_routing(date, date, uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metrics_routing(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_building uuid DEFAULT NULL::uuid, p_team uuid DEFAULT NULL::uuid, p_category uuid DEFAULT NULL::uuid, p_dependency uuid DEFAULT NULL::uuid) RETURNS TABLE(offers bigint, pending_offers bigint, taken bigint, avg_time_to_take interval)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  with base as (
    select
      t.id,
      (select count(*) from public.ticket_offers o where o.ticket_id = t.id) as offers,
      (select count(*) from public.ticket_offers o
        where o.ticket_id = t.id and o.status = 'offered') as pending_offers,
      (select count(*) from public.ticket_offers o
        where o.ticket_id = t.id and o.status = 'taken') as taken,
      (select min(o.resolved_at) from public.ticket_offers o
        where o.ticket_id = t.id and o.status = 'taken') - t.reported_at as time_to_take
    from public.tickets t
    where public.metrics_date_in(t.reported_at, p_from, p_to)
      and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
        t.building_id, t.team_id, t.category_id, t.dependency_id)
  )
  select sum(offers), sum(pending_offers), sum(taken), avg(time_to_take)
  from base;
$$;


--
-- Name: FUNCTION metrics_routing(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.metrics_routing(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid) IS 'Ofertas, pendientes, tomadas y tiempo medio hasta la toma, filtrados.';


--
-- Name: metrics_satisfaction(date, date, uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metrics_satisfaction(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_building uuid DEFAULT NULL::uuid, p_team uuid DEFAULT NULL::uuid, p_category uuid DEFAULT NULL::uuid, p_dependency uuid DEFAULT NULL::uuid) RETURNS TABLE(average_score numeric, ratings bigint)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select round(avg(r.score)::numeric, 3), count(*)
  from public.ticket_ratings r
  join public.tickets t on t.id = r.ticket_id
  where public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id);
$$;


--
-- Name: FUNCTION metrics_satisfaction(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.metrics_satisfaction(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid) IS 'Satisfacción promedio y número de calificaciones, filtrado.';


--
-- Name: metrics_sla(date, date, uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metrics_sla(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_building uuid DEFAULT NULL::uuid, p_team uuid DEFAULT NULL::uuid, p_category uuid DEFAULT NULL::uuid, p_dependency uuid DEFAULT NULL::uuid) RETURNS TABLE(with_target bigint, met bigint, compliance_rate numeric, avg_target_minutes numeric, avg_resolution_minutes numeric)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select
    count(*) filter (where s.target_minutes is not null and s.closed_at is not null),
    count(*) filter (where s.meets),
    round(
      count(*) filter (where s.meets)::numeric
        / nullif(count(*) filter (where s.target_minutes is not null and s.closed_at is not null), 0),
      4),
    avg(s.target_minutes) filter (where s.target_minutes is not null and s.closed_at is not null),
    avg(s.resolution_minutes) filter (where s.target_minutes is not null and s.closed_at is not null)
  from public.v_ticket_sla s
  join public.tickets t on t.id = s.id
  where public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id);
$$;


--
-- Name: FUNCTION metrics_sla(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.metrics_sla(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid) IS 'Cumplimiento de tiempos objetivo filtrado por rango y dimensión.';


--
-- Name: metrics_sla_by_priority(date, date, uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.metrics_sla_by_priority(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_building uuid DEFAULT NULL::uuid, p_team uuid DEFAULT NULL::uuid, p_category uuid DEFAULT NULL::uuid, p_dependency uuid DEFAULT NULL::uuid) RETURNS TABLE(priority_id uuid, priority_name text, with_target bigint, met bigint, compliance_rate numeric)
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
  select
    pr.id,
    pr.name,
    count(*) filter (where s.target_minutes is not null and s.closed_at is not null),
    count(*) filter (where s.meets),
    round(
      count(*) filter (where s.meets)::numeric
        / nullif(count(*) filter (where s.target_minutes is not null and s.closed_at is not null), 0),
      4)
  from public.v_ticket_sla s
  join public.tickets t on t.id = s.id
  join public.priorities pr on pr.id = s.priority_id
  where public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id)
  group by pr.id, pr.name
  order by pr.name;
$$;


--
-- Name: FUNCTION metrics_sla_by_priority(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.metrics_sla_by_priority(p_from date, p_to date, p_building uuid, p_team uuid, p_category uuid, p_dependency uuid) IS 'Cumplimiento de tiempos objetivo por prioridad, filtrado.';


--
-- Name: notify_event(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_event(p_event_id bigint) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
declare
  e public.ticket_events;
  r public.notification_rules;
  v_ticket public.tickets;
  v_uid uuid;
begin
  select * into e from public.ticket_events where id = p_event_id;
  if e.id is null then return; end if;
  select * into v_ticket from public.tickets where id = e.ticket_id;

  for r in select * from public.notification_rules
           where active and event_type = e.type loop
    if r.recipient = 'requester' then
      select user_id into v_uid from public.requesters where id = v_ticket.requester_id;
      if v_uid is not null then
        insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
        values (v_uid, e.ticket_id, e.id, e.type, r.channel, e.payload);
      else
        insert into public.notifications (recipient_requester_id, ticket_id, event_id, type, channel, payload)
        values (v_ticket.requester_id, e.ticket_id, e.id, e.type, r.channel, e.payload);
      end if;

    elsif r.recipient = 'assigned_technician' then
      select t.user_id into v_uid
      from public.ticket_assignments a
      join public.technicians t on t.id = a.assignee_technician_id
      where a.ticket_id = e.ticket_id and a.stage = 'technician' and a.ended_at is null
      order by a.assigned_at desc limit 1;
      if v_uid is not null then
        insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
        values (v_uid, e.ticket_id, e.id, e.type, r.channel, e.payload);
      end if;

    elsif r.recipient = 'supervisor' then
      select assignee_user_id into v_uid from public.ticket_assignments
      where ticket_id = e.ticket_id and stage = 'supervisor' and ended_at is null
      order by assigned_at desc limit 1;
      if v_uid is not null then
        insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
        values (v_uid, e.ticket_id, e.id, e.type, r.channel, e.payload);
      end if;

    elsif r.recipient = 'offers' then
      insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
      select supervisor_user_id, e.ticket_id, e.id, e.type, r.channel, e.payload
      from public.ticket_offers
      where ticket_id = e.ticket_id and status = 'offered';

    elsif r.recipient = 'administrators' then
      insert into public.notifications (recipient_user_id, ticket_id, event_id, type, channel, payload)
      select ur.user_id, e.ticket_id, e.id, e.type, r.channel, e.payload
      from public.user_roles ur
      join public.roles ro on ro.id = ur.role_id
      where ro.name = 'administrator';
    end if;
  end loop;
end;
$$;


--
-- Name: prevent_mutation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'La tabla % es de solo agregar', tg_table_name;
end;
$$;


--
-- Name: reasons_enforce_same_use(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reasons_enforce_same_use() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  parent_use public.reason_use;
begin
  if new.parent_id is not null then
    select r.use into parent_use from public.reasons r where r.id = new.parent_id;
    if parent_use is null then
      raise exception 'El motivo padre % no existe', new.parent_id;
    end if;
    if parent_use <> new.use then
      raise exception 'El motivo hijo (%) debe tener el uso del padre (%)', new.use, parent_use;
    end if;
  end if;
  return new;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: ticket_calendar(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ticket_calendar(p_ticket_id uuid) RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select coalesce(team.work_calendar_id, settings.default_calendar_id)
  from public.tickets t
  left join public.teams team on team.id = t.team_id
  cross join (select default_calendar_id from public.instance_settings limit 1) settings
  where t.id = p_ticket_id;
$$;


--
-- Name: FUNCTION ticket_calendar(p_ticket_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ticket_calendar(p_ticket_id uuid) IS 'Calendario laboral del tiquet: el del equipo o el de la instancia.';


--
-- Name: ticket_events_notify(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ticket_events_notify() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  perform public.notify_event(new.id);
  return new;
end;
$$;


--
-- Name: ticket_events_record_spans(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ticket_events_record_spans() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  v_reported timestamptz;
  v_prev timestamptz;
  v_clock public.clock_class;
begin
  select reported_at into v_reported from public.tickets where id = new.ticket_id;

  if new.type = 'taken' then
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'supervisor_response', v_reported, new.occurred_at);

  elsif new.type = 'reassigned_supervisor' then
    select max(occurred_at) into v_prev from public.ticket_events
      where ticket_id = new.ticket_id
        and type in ('taken', 'reassigned_supervisor') and occurred_at < new.occurred_at;
    insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'reassignment', new.reason_id,
            coalesce(v_prev, v_reported), new.occurred_at);

  elsif new.type = 'assigned_technician' then
    select max(occurred_at) into v_prev from public.ticket_events
      where ticket_id = new.ticket_id and type = 'taken';
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'technician_assignment',
            coalesce(v_prev, v_reported), new.occurred_at);

  elsif new.type = 'started' then
    select max(occurred_at) into v_prev from public.ticket_events
      where ticket_id = new.ticket_id and type = 'assigned_technician';
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'wait_start', coalesce(v_prev, v_reported), new.occurred_at);
    insert into public.time_spans (ticket_id, cycle, kind, started_at)
    values (new.ticket_id, new.cycle, 'active_work', new.occurred_at);

  elsif new.type = 'paused' then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'active_work' and ended_at is null;
    select clock_class into v_clock from public.reasons where id = new.reason_id;
    insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, clock_class)
    values (new.ticket_id, new.cycle, 'pause', new.reason_id, new.occurred_at,
            coalesce(v_clock, 'counted'));

  elsif new.type = 'pause_advanced' then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'pause' and ended_at is null;
    select clock_class into v_clock from public.reasons where id = new.reason_id;
    insert into public.time_spans (ticket_id, cycle, kind, ref_id, started_at, clock_class)
    values (new.ticket_id, new.cycle, 'pause', new.reason_id, new.occurred_at,
            coalesce(v_clock, 'counted'));

  elsif new.type = 'resumed' then
    if new.reason_id is not null then
      select clock_class into v_clock from public.reasons where id = new.reason_id;
      update public.time_spans
      set ref_id = new.reason_id, clock_class = coalesce(v_clock, 'counted')
      where ticket_id = new.ticket_id and kind = 'pause' and ended_at is null;
    end if;
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'pause' and ended_at is null;
    insert into public.time_spans (ticket_id, cycle, kind, started_at)
    values (new.ticket_id, new.cycle, 'active_work', new.occurred_at);

  elsif new.type = 'attended' then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'active_work' and ended_at is null;
    insert into public.time_spans (ticket_id, cycle, kind, started_at)
    values (new.ticket_id, new.cycle, 'validation', new.occurred_at);

  elsif new.type = 'validated' then
    if (select status from public.tickets where id = new.ticket_id) = 'closed' then
      update public.time_spans set ended_at = new.occurred_at
        where ticket_id = new.ticket_id and kind = 'validation' and ended_at is null;
    end if;

  elsif new.type = 'claim_opened' then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'validation' and ended_at is null;
    insert into public.time_spans (ticket_id, cycle, kind, started_at)
    values (new.ticket_id, new.cycle, 'claim', new.occurred_at);

  elsif new.type in ('claim_resolved', 'reopened') then
    update public.time_spans set ended_at = new.occurred_at
      where ticket_id = new.ticket_id and kind = 'claim' and ended_at is null;

  elsif new.type = 'duplicate_marked' then
    insert into public.time_spans (ticket_id, cycle, kind, started_at, ended_at)
    values (new.ticket_id, new.cycle, 'duplicate_review', v_reported, new.occurred_at);
  end if;

  return new;
end;
$$;


--
-- Name: ticket_time_by_kind(uuid, public.time_span_kind); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ticket_time_by_kind(p_ticket_id uuid, p_kind public.time_span_kind) RETURNS interval
    LANGUAGE sql STABLE
    AS $$
  select coalesce(sum(coalesce(ended_at, now()) - started_at), interval '0')
  from public.time_spans
  where ticket_id = p_ticket_id and kind = p_kind and voided_at is null;
$$;


--
-- Name: FUNCTION ticket_time_by_kind(p_ticket_id uuid, p_kind public.time_span_kind); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ticket_time_by_kind(p_ticket_id uuid, p_kind public.time_span_kind) IS 'Suma por tipo de tramo (excluye anulados).';


--
-- Name: ticket_time_by_kind_extra(uuid, public.time_span_kind); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ticket_time_by_kind_extra(p_ticket_id uuid, p_kind public.time_span_kind) RETURNS interval
    LANGUAGE sql STABLE
    AS $$
  select public.ticket_time_by_kind(p_ticket_id, p_kind)
       - public.ticket_time_by_kind_laboral(p_ticket_id, p_kind);
$$;


--
-- Name: FUNCTION ticket_time_by_kind_extra(p_ticket_id uuid, p_kind public.time_span_kind); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ticket_time_by_kind_extra(p_ticket_id uuid, p_kind public.time_span_kind) IS 'Tiempo de un tipo de tramo fuera del horario laboral (extra).';


--
-- Name: ticket_time_by_kind_laboral(uuid, public.time_span_kind); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ticket_time_by_kind_laboral(p_ticket_id uuid, p_kind public.time_span_kind) RETURNS interval
    LANGUAGE sql STABLE
    AS $$
  select coalesce(sum(public.work_calendar_overlap(
    public.ticket_calendar(p_ticket_id),
    ts.started_at,
    coalesce(ts.ended_at, now())
  )), interval '0')
  from public.time_spans ts
  where ts.ticket_id = p_ticket_id and ts.kind = p_kind and ts.voided_at is null;
$$;


--
-- Name: FUNCTION ticket_time_by_kind_laboral(p_ticket_id uuid, p_kind public.time_span_kind); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ticket_time_by_kind_laboral(p_ticket_id uuid, p_kind public.time_span_kind) IS 'Suma laboral por tipo de tramo (excluye anulados).';


--
-- Name: ticket_time_net(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ticket_time_net(p_ticket_id uuid) RETURNS interval
    LANGUAGE sql STABLE
    AS $$
  select public.ticket_time_total(p_ticket_id)
    - coalesce((
        select sum(coalesce(ended_at, now()) - started_at)
        from public.time_spans
        where ticket_id = p_ticket_id and clock_class = 'not_counted'
          and voided_at is null
      ), interval '0');
$$;


--
-- Name: FUNCTION ticket_time_net(p_ticket_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ticket_time_net(p_ticket_id uuid) IS 'Tiempo neto (excluye no contables y anulados).';


--
-- Name: ticket_time_net_laboral(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ticket_time_net_laboral(p_ticket_id uuid) RETURNS interval
    LANGUAGE sql STABLE
    AS $$
  select public.ticket_time_total_laboral(p_ticket_id)
    - coalesce((
        select sum(public.work_calendar_overlap(
          public.ticket_calendar(p_ticket_id),
          ts.started_at,
          coalesce(ts.ended_at, now())
        ))
        from public.time_spans ts
        where ts.ticket_id = p_ticket_id
          and ts.clock_class = 'not_counted'
          and ts.voided_at is null
      ), interval '0');
$$;


--
-- Name: FUNCTION ticket_time_net_laboral(p_ticket_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ticket_time_net_laboral(p_ticket_id uuid) IS 'Tiempo neto en modo laboral (excluye no contables y anulados).';


--
-- Name: ticket_time_total(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ticket_time_total(p_ticket_id uuid) RETURNS interval
    LANGUAGE sql STABLE
    AS $$
  select coalesce(t.closed_at, now()) - t.reported_at
  from public.tickets t where t.id = p_ticket_id;
$$;


--
-- Name: FUNCTION ticket_time_total(p_ticket_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ticket_time_total(p_ticket_id uuid) IS 'Tiempo total continuo (RN §7).';


--
-- Name: ticket_time_total_laboral(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ticket_time_total_laboral(p_ticket_id uuid) RETURNS interval
    LANGUAGE sql STABLE
    AS $$
  select public.work_calendar_overlap(
    public.ticket_calendar(p_ticket_id),
    t.reported_at,
    coalesce(t.closed_at, now())
  )
  from public.tickets t where t.id = p_ticket_id;
$$;


--
-- Name: FUNCTION ticket_time_total_laboral(p_ticket_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ticket_time_total_laboral(p_ticket_id uuid) IS 'Tiempo total en modo laboral (recortado por el calendario).';


--
-- Name: tickets_check_classification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tickets_check_classification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  loc_building uuid;
  sub_category uuid;
  prb_subcategory uuid;
begin
  if new.team_id is null then
    select team_id into new.team_id from public.categories where id = new.category_id;
  end if;

  select building_id into loc_building from public.locations where id = new.location_id;
  if loc_building is null or loc_building <> new.building_id then
    raise exception 'La ubicación % no pertenece al edificio %', new.location_id, new.building_id;
  end if;

  if new.subcategory_id is not null then
    select category_id into sub_category from public.subcategories where id = new.subcategory_id;
    if sub_category is null or sub_category <> new.category_id then
      raise exception 'La subcategoría % no pertenece a la categoría %',
        new.subcategory_id, new.category_id;
    end if;
  end if;

  if new.problem_id is not null then
    if new.subcategory_id is null then
      raise exception 'No se puede indicar un problema sin subcategoría';
    end if;
    select subcategory_id into prb_subcategory from public.problems where id = new.problem_id;
    if prb_subcategory is null or prb_subcategory <> new.subcategory_id then
      raise exception 'El problema % no pertenece a la subcategoría %',
        new.problem_id, new.subcategory_id;
    end if;
  end if;

  return new;
end;
$$;


--
-- Name: tickets_close_participants(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tickets_close_participants() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
begin
  if (new.status in ('closed', 'rejected', 'cancelled', 'duplicate')
        and new.status is distinct from old.status)
     or (new.cycle is distinct from old.cycle) then
    update public.ticket_participants
    set ended_at = now()
    where ticket_id = new.id and ended_at is null;
  end if;
  return new;
end;
$$;


--
-- Name: FUNCTION tickets_close_participants(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.tickets_close_participants() IS 'Cierra las participaciones activas al cerrar/terminar el tiquet o cambiar de ciclo.';


--
-- Name: tickets_immutable_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tickets_immutable_fields() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.folio <> old.folio then
    raise exception 'El folio no puede cambiar';
  end if;
  if new.ticket_number <> old.ticket_number then
    raise exception 'El número de tiquet no puede cambiar';
  end if;
  return new;
end;
$$;


--
-- Name: tickets_set_folio(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tickets_set_folio() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  pattern text;
  tz text;
  year_text text;
begin
  select folio_pattern, timezone into pattern, tz
  from public.instance_settings limit 1;
  pattern := coalesce(pattern, 'AX-{yyyy}-{num}');
  tz := coalesce(tz, 'UTC');
  year_text := to_char(new.reported_at at time zone tz, 'YYYY');
  new.folio := replace(replace(pattern, '{yyyy}', year_text), '{num}', new.ticket_number::text);
  return new;
end;
$$;


--
-- Name: work_calendar_overlap(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.work_calendar_overlap(p_calendar_id uuid, p_start timestamp with time zone, p_end timestamp with time zone) RETURNS interval
    LANGUAGE plpgsql STABLE
    AS $$
declare
  v_tz text;
  v_day date;
  v_slot record;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_total interval := interval '0';
begin
  if p_start is null or p_end is null or p_end <= p_start then
    return interval '0';
  end if;
  if p_calendar_id is null then
    return p_end - p_start;
  end if;

  select timezone into v_tz
  from public.work_calendars where id = p_calendar_id and active;
  if v_tz is null then
    -- Calendario inexistente o inactivo: se comporta como continuo (modo calendario).
    return p_end - p_start;
  end if;

  for v_day in
    select d::date
    from generate_series(
      (p_start at time zone v_tz)::date,
      (p_end at time zone v_tz)::date,
      interval '1 day'
    ) as d
  loop
    if exists (
      select 1 from public.work_calendar_holidays h
      where h.calendar_id = p_calendar_id and h.holiday = v_day
    ) then
      continue;
    end if;

    for v_slot in
      select start_time, end_time
      from public.work_calendar_intervals
      where calendar_id = p_calendar_id
        and weekday = extract(dow from v_day)::smallint
    loop
      v_slot_start := (v_day + v_slot.start_time) at time zone v_tz;
      v_slot_end := (v_day + v_slot.end_time) at time zone v_tz;
      v_total := v_total + greatest(
        least(v_slot_end, p_end) - greatest(v_slot_start, p_start),
        interval '0'
      );
    end loop;
  end loop;

  return v_total;
end;
$$;


--
-- Name: FUNCTION work_calendar_overlap(p_calendar_id uuid, p_start timestamp with time zone, p_end timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.work_calendar_overlap(p_calendar_id uuid, p_start timestamp with time zone, p_end timestamp with time zone) IS 'Recorta un intervalo contra el calendario laboral (franjas semanales, días no laborables y zona horaria).';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: buildings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buildings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: catalog_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_aliases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    catalog text NOT NULL,
    alias text NOT NULL,
    record_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE catalog_aliases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.catalog_aliases IS 'Texto original de la fuente -> registro del catálogo, por tipo de catálogo.';


--
-- Name: catalog_import_rows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_import_rows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    catalog_key text NOT NULL,
    row_number integer,
    raw jsonb DEFAULT '{}'::jsonb NOT NULL,
    result text NOT NULL,
    record_id uuid,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT catalog_import_rows_result_check CHECK ((result = ANY (ARRAY['inserted'::text, 'updated'::text, 'skipped'::text, 'error'::text])))
);


--
-- Name: TABLE catalog_import_rows; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.catalog_import_rows IS 'Fila de una carga de catálogos con su resultado; nada se pierde (raw).';


--
-- Name: catalog_import_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_import_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mode text DEFAULT 'commit'::text NOT NULL,
    source_file text,
    status text DEFAULT 'running'::text NOT NULL,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT catalog_import_runs_mode_check CHECK ((mode = ANY (ARRAY['dry_run'::text, 'commit'::text]))),
    CONSTRAINT catalog_import_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: TABLE catalog_import_runs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.catalog_import_runs IS 'Carga de catálogos: archivo, modo, estado y resumen por catálogo.';


--
-- Name: catalog_import_specs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_import_specs (
    catalog_key text NOT NULL,
    table_name text NOT NULL,
    columns jsonb NOT NULL,
    match_columns jsonb NOT NULL
);


--
-- Name: TABLE catalog_import_specs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.catalog_import_specs IS 'Lista blanca de catálogos importables: tabla destino, columnas y clave natural.';


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_platform boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN channels.is_platform; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.channels.is_platform IS 'Canal que representa a la plataforma; se usa al registrar desde la app.';


--
-- Name: dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: escalation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escalation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    condition public.escalation_condition NOT NULL,
    threshold interval NOT NULL,
    notify text DEFAULT 'supervisor'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE escalation_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.escalation_rules IS 'Reglas de escalamiento (RN-21). El disparo programado llega después.';


--
-- Name: evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    cycle integer NOT NULL,
    event_id bigint,
    type public.evidence_type NOT NULL,
    storage_path text,
    mime_type text,
    size_bytes bigint,
    captured_by_technician_id uuid,
    captured_by_user_id uuid,
    uploaded_by uuid,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    client_request_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    thumbnail_path text,
    sha256 text,
    width integer,
    height integer,
    processing_state text DEFAULT 'pending'::text NOT NULL,
    processed_at timestamp with time zone,
    processing_error text,
    CONSTRAINT evidence_cycle_check CHECK ((cycle > 0)),
    CONSTRAINT evidence_height_check CHECK (((height IS NULL) OR (height > 0))),
    CONSTRAINT evidence_processing_state_check CHECK ((processing_state = ANY (ARRAY['pending'::text, 'ready'::text, 'failed'::text]))),
    CONSTRAINT evidence_size_bytes_check CHECK (((size_bytes IS NULL) OR (size_bytes >= 0))),
    CONSTRAINT evidence_width_check CHECK (((width IS NULL) OR (width > 0)))
);


--
-- Name: TABLE evidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.evidence IS 'Evidencias por evento (request, before, during, after, claim, other). Nunca se borran.';


--
-- Name: COLUMN evidence.processing_state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.evidence.processing_state IS 'pending mientras el archivo se sube/procesa; ready cuando la miniatura y el tipo están verificados.';


--
-- Name: external_systems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_systems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    authority text DEFAULT 'source'::text NOT NULL,
    CONSTRAINT external_systems_authority_check CHECK ((authority = ANY (ARRAY['source'::text, 'axia'::text, 'manual'::text])))
);


--
-- Name: TABLE external_systems; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.external_systems IS 'Catálogo genérico de sistemas externos (solo el nombre; el núcleo no conoce sus valores).';


--
-- Name: COLUMN external_systems.authority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.external_systems.authority IS 'Quién manda en un conflicto de datos: el origen, Axia o decisión manual.';


--
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idempotency_keys (
    client_request_id uuid NOT NULL,
    actor_id uuid,
    operation text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'applied'::text NOT NULL,
    response jsonb,
    expires_at timestamp with time zone,
    CONSTRAINT idempotency_keys_status_check CHECK ((status = ANY (ARRAY['applied'::text, 'duplicate'::text, 'rejected'::text, 'conflict'::text])))
);


--
-- Name: TABLE idempotency_keys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.idempotency_keys IS 'Registro de acciones idempotentes; la clave de evento sigue en ticket_events.client_request_id.';


--
-- Name: import_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system text NOT NULL,
    mode text DEFAULT 'dry_run'::text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT import_batches_mode_check CHECK ((mode = ANY (ARRAY['dry_run'::text, 'commit'::text]))),
    CONSTRAINT import_batches_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: TABLE import_batches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.import_batches IS 'Lote de importación: origen, modo (dry run o commit), estado y resumen.';


--
-- Name: import_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    row_number integer,
    raw jsonb NOT NULL,
    result text DEFAULT 'pending'::text NOT NULL,
    ticket_id uuid,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT import_records_result_check CHECK ((result = ANY (ARRAY['pending'::text, 'inserted'::text, 'updated'::text, 'skipped'::text, 'error'::text])))
);


--
-- Name: TABLE import_records; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.import_records IS 'Fila cruda de un lote con su resultado; nada se pierde (raw).';


--
-- Name: import_status_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_status_map (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    system text NOT NULL,
    external_status text NOT NULL,
    ticket_status public.ticket_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE import_status_map; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.import_status_map IS 'Estatus de la fuente -> estado de Axia, por sistema.';


--
-- Name: instance_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instance_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    singleton boolean DEFAULT true NOT NULL,
    team_label text DEFAULT 'Equipo'::text NOT NULL,
    validation_policy text DEFAULT 'both'::text NOT NULL,
    auto_validation_days integer,
    claim_window interval DEFAULT '1 day'::interval NOT NULL,
    duplicate_window interval DEFAULT '7 days'::interval NOT NULL,
    duplicate_similarity numeric(4,3) DEFAULT 0.300 NOT NULL,
    duplicate_shown_fields text[] DEFAULT '{folio,status,reported_at,building,problem,requester_contact}'::text[] NOT NULL,
    folio_pattern text DEFAULT 'AX-{yyyy}-{num}'::text NOT NULL,
    timezone text DEFAULT 'America/Mexico_City'::text NOT NULL,
    default_calendar_id uuid,
    request_evidence_policy text DEFAULT 'recommended'::text NOT NULL,
    requester_visible_event_types public.event_type[] DEFAULT '{created,taken,assigned_technician,reassigned_supervisor,reassigned_technician,started,paused,resumed,attended,validated,priority_changed,capture_recaptured,claim_opened,claim_resolved,reopened,rejected,cancelled,duplicate_marked}'::public.event_type[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sla_clock_mode text DEFAULT 'calendar'::text NOT NULL,
    default_priority_id uuid,
    CONSTRAINT instance_settings_auto_validation_days_check CHECK (((auto_validation_days IS NULL) OR (auto_validation_days > 0))),
    CONSTRAINT instance_settings_duplicate_similarity_check CHECK (((duplicate_similarity >= (0)::numeric) AND (duplicate_similarity <= (1)::numeric))),
    CONSTRAINT instance_settings_request_evidence_policy_check CHECK ((request_evidence_policy = ANY (ARRAY['optional'::text, 'recommended'::text, 'required'::text]))),
    CONSTRAINT instance_settings_singleton_check CHECK (singleton),
    CONSTRAINT instance_settings_sla_clock_mode_check CHECK ((sla_clock_mode = ANY (ARRAY['calendar'::text, 'laboral'::text]))),
    CONSTRAINT instance_settings_validation_policy_check CHECK ((validation_policy = ANY (ARRAY['requester'::text, 'supervisor'::text, 'both'::text])))
);


--
-- Name: TABLE instance_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.instance_settings IS 'Configuración de la instancia (una fila por base). Ver docs/modelo-datos.md §3.1.';


--
-- Name: COLUMN instance_settings.sla_clock_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instance_settings.sla_clock_mode IS 'Modo de reloj con el que se mide el cumplimiento de los tiempos objetivo.';


--
-- Name: integration_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    system text NOT NULL,
    description text NOT NULL,
    assigned_to uuid,
    due_date date,
    status text DEFAULT 'open'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT integration_tasks_status_check CHECK ((status = ANY (ARRAY['open'::text, 'done'::text, 'cancelled'::text])))
);


--
-- Name: TABLE integration_tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.integration_tasks IS 'Tareas para reflejar en el sistema externo un cambio de Axia, con responsable y fecha.';


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    building_id uuid NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    id bigint NOT NULL,
    username text NOT NULL,
    user_id uuid,
    ip inet,
    successful boolean NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE login_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.login_attempts IS 'Intentos de acceso para bloqueo y auditoría.';


--
-- Name: login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.login_attempts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.login_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notification_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid NOT NULL,
    channel public.notification_channel NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    last_attempt_at timestamp with time zone,
    sent_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_deliveries_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT notification_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'abandoned'::text]))),
    CONSTRAINT notification_deliveries_notification_id_channel_key UNIQUE (notification_id, channel)
);


--
-- Name: TABLE notification_deliveries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_deliveries IS 'Cola de entrega de notificaciones con reintentos y limpieza de suscripciones inválidas.';


--
-- Name: notification_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type public.event_type NOT NULL,
    recipient text NOT NULL,
    channel public.notification_channel DEFAULT 'in_app'::public.notification_channel NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_rules_recipient_check CHECK ((recipient = ANY (ARRAY['requester'::text, 'assigned_technician'::text, 'supervisor'::text, 'offers'::text, 'administrators'::text])))
);


--
-- Name: TABLE notification_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_rules IS 'Reglas configurables: tipo de evento → destinatario → canal (RN §9).';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_user_id uuid,
    recipient_requester_id uuid,
    ticket_id uuid,
    event_id bigint,
    type public.event_type NOT NULL,
    channel public.notification_channel DEFAULT 'in_app'::public.notification_channel NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_check CHECK (((recipient_user_id IS NOT NULL) OR (recipient_requester_id IS NOT NULL)))
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'Notificaciones por destinatario. Para contactos sin cuenta queda "para el contacto".';


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id text NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.permissions IS 'Permisos fijos del sistema (no configurables).';


--
-- Name: priorities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.priorities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    "position" smallint DEFAULT 0 NOT NULL,
    target_minutes integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT priorities_target_minutes_check CHECK (((target_minutes IS NULL) OR (target_minutes > 0)))
);


--
-- Name: COLUMN priorities.target_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.priorities.target_minutes IS 'Tiempo objetivo opcional. Dejar NULL si la institución no define SLA todavía.';


--
-- Name: problems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.problems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subcategory_id uuid NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    default_priority_id uuid
);


--
-- Name: COLUMN problems.default_priority_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.problems.default_priority_id IS 'Prioridad que hereda el tiquet al elegir este problema.';


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE push_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.push_subscriptions IS 'Suscripciones Web Push del navegador de cada usuario (una por endpoint).';


--
-- Name: reasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    use public.reason_use NOT NULL,
    parent_id uuid,
    name text NOT NULL,
    "position" smallint DEFAULT 0 NOT NULL,
    requires_note boolean DEFAULT false NOT NULL,
    allows_estimated_date boolean DEFAULT false NOT NULL,
    clock_class public.clock_class DEFAULT 'counted'::public.clock_class NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE reasons; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reasons IS 'Motivos jerárquicos por uso (pausa, rechazo, reclamación…). Ver docs/modelo-datos.md §3.3.';


--
-- Name: COLUMN reasons.clock_class; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reasons.clock_class IS 'Clasificación de reloj del nodo; se copia al tramo al crearse.';


--
-- Name: requesters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requesters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    contact text,
    dependency_id uuid,
    user_id uuid,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE requesters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.requesters IS 'Solicitantes con vínculo opcional a una cuenta (modelo mixto).';


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id text NOT NULL,
    scope public.permission_scope NOT NULL
);


--
-- Name: TABLE role_permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.role_permissions IS 'Permiso (con su ámbito) asignado a un rol. Ámbitos: own, team, buildings, all.';


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    label text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.roles IS 'Roles configurables, armados con permisos y ámbito (RN-26).';


--
-- Name: service_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    target_minutes integer,
    CONSTRAINT service_types_target_minutes_check CHECK (((target_minutes IS NULL) OR (target_minutes > 0)))
);


--
-- Name: COLUMN service_types.target_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.service_types.target_minutes IS 'Tiempo objetivo opcional del tipo de servicio; sobrescribe al de la prioridad.';


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    idle_expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    user_agent text,
    ip inet
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sessions IS 'Sesiones de la aplicación; solo se guarda el hash del token.';


--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: supervisor_scope_buildings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supervisor_scope_buildings (
    scope_id uuid NOT NULL,
    building_id uuid NOT NULL
);


--
-- Name: supervisor_scopes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supervisor_scopes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    team_id uuid NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE supervisor_scopes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.supervisor_scopes IS 'Ámbito de un supervisor: equipo y edificios (RN-04).';


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    work_calendar_id uuid
);


--
-- Name: TABLE teams; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teams IS 'Equipos que atienden (mantenimiento, seguridad…).';


--
-- Name: COLUMN teams.work_calendar_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams.work_calendar_id IS 'Calendario laboral del equipo; si es NULL se usa instance_settings.default_calendar_id.';


--
-- Name: technician_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.technician_categories (
    technician_id uuid NOT NULL,
    category_id uuid NOT NULL
);


--
-- Name: TABLE technician_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.technician_categories IS 'Designación de técnicos a categorías.';


--
-- Name: technicians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.technicians (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    user_id uuid,
    team_id uuid NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE technicians; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.technicians IS 'Técnicos con vínculo opcional a una cuenta; puede existir sin cuenta.';


--
-- Name: ticket_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    cycle integer NOT NULL,
    stage public.assignment_stage NOT NULL,
    assignee_user_id uuid,
    assignee_technician_id uuid,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    reason_id uuid,
    note text,
    client_request_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ticket_assignments_assignee_check CHECK ((((stage = 'supervisor'::public.assignment_stage) AND (assignee_user_id IS NOT NULL) AND (assignee_technician_id IS NULL)) OR ((stage = 'technician'::public.assignment_stage) AND (assignee_technician_id IS NOT NULL)))),
    CONSTRAINT ticket_assignments_cycle_check CHECK ((cycle > 0))
);


--
-- Name: TABLE ticket_assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_assignments IS 'Cada salto de la cadena. stage supervisor → usuario; technician → catálogo de técnicos.';


--
-- Name: ticket_captures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_captures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    cycle integer NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    reason_id uuid,
    changes jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ticket_captures_cycle_check CHECK ((cycle > 0))
);


--
-- Name: TABLE ticket_captures; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_captures IS 'Recapturas: versión aplicada sobre el mismo tiquet, con el original y cada versión.';


--
-- Name: ticket_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    cycle integer NOT NULL,
    opened_by uuid,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    reason_id uuid NOT NULL,
    description text NOT NULL,
    status public.claim_status DEFAULT 'open'::public.claim_status NOT NULL,
    prior_status public.ticket_status NOT NULL,
    resolution public.claim_resolution,
    result_id uuid,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_note text,
    client_request_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ticket_claims_cycle_check CHECK ((cycle > 0))
);


--
-- Name: TABLE ticket_claims; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_claims IS 'Reclamaciones (RN-16/RN-17).';


--
-- Name: ticket_duplicate_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_duplicate_candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    candidate_ticket_id uuid NOT NULL,
    similarity numeric(4,3) NOT NULL,
    shown_at timestamp with time zone DEFAULT now() NOT NULL,
    decision text,
    CONSTRAINT ticket_duplicate_candidates_decision_check CHECK ((decision = ANY (ARRAY['ignored'::text, 'linked'::text, 'dismissed'::text])))
);


--
-- Name: TABLE ticket_duplicate_candidates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_duplicate_candidates IS 'Candidatos a duplicado mostrados al registrar (RN-29). No bloquea.';


--
-- Name: ticket_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_events (
    id bigint NOT NULL,
    ticket_id uuid NOT NULL,
    cycle integer NOT NULL,
    type public.event_type NOT NULL,
    actor_id uuid,
    subject_user_id uuid,
    subject_technician_id uuid,
    reason_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    source public.event_source DEFAULT 'app'::public.event_source NOT NULL,
    client_request_id uuid,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ticket_events_cycle_check CHECK ((cycle > 0))
);


--
-- Name: TABLE ticket_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_events IS 'Bitácora de solo agregar. actor_id = quién; subject_* = a nombre de quién (proxy).';


--
-- Name: ticket_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ticket_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ticket_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ticket_external_refs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_external_refs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    system text NOT NULL,
    external_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    external_status text
);


--
-- Name: TABLE ticket_external_refs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_external_refs IS 'Identificadores de un tiquet en otros sistemas. Núcleo agnóstico (ADR 0006).';


--
-- Name: COLUMN ticket_external_refs.external_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ticket_external_refs.external_status IS 'Estado reportado por el sistema externo, para detectar diferencias sin acoplar el modelo.';


--
-- Name: ticket_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    linked_ticket_id uuid NOT NULL,
    link_type public.link_type NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ticket_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_links IS 'Enlaces entre tiquets. ticket_id es el que se enlaza; linked_ticket_id el referido.';


--
-- Name: ticket_offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    cycle integer NOT NULL,
    supervisor_user_id uuid NOT NULL,
    status public.offer_status DEFAULT 'offered'::public.offer_status NOT NULL,
    offered_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT ticket_offers_cycle_check CHECK ((cycle > 0))
);


--
-- Name: TABLE ticket_offers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_offers IS 'Oferta del tiquet a cada supervisor candidato (RN-03/RN-05).';


--
-- Name: ticket_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    cycle integer NOT NULL,
    technician_id uuid NOT NULL,
    participation_type public.participation_type NOT NULL,
    category_id uuid,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    origin public.span_origin DEFAULT 'system'::public.span_origin NOT NULL,
    recorded_by uuid,
    client_request_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ticket_participants_cycle_check CHECK ((cycle > 0))
);


--
-- Name: TABLE ticket_participants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_participants IS 'Participación (líder o auxiliar) por tiquet y categoría, para medir horas (RN-09).';


--
-- Name: ticket_pause_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_pause_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pause_id uuid NOT NULL,
    reason_id uuid NOT NULL,
    entered_at timestamp with time zone DEFAULT now() NOT NULL,
    exited_at timestamp with time zone,
    actor_id uuid,
    note text
);


--
-- Name: TABLE ticket_pause_steps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_pause_steps IS 'Cada paso del subestado de la pausa (para medir tiempo por subestado).';


--
-- Name: ticket_pauses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_pauses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    cycle integer NOT NULL,
    reason_id uuid NOT NULL,
    opened_by uuid,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    note text,
    estimated_date date,
    origin public.span_origin DEFAULT 'system'::public.span_origin NOT NULL,
    recorded_by uuid,
    client_request_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    root_reason_id uuid NOT NULL,
    CONSTRAINT ticket_pauses_cycle_check CHECK ((cycle > 0))
);


--
-- Name: TABLE ticket_pauses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_pauses IS 'Pausa de un tiquet (máximo una abierta). reason_id es el subestado actual.';


--
-- Name: COLUMN ticket_pauses.root_reason_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ticket_pauses.root_reason_id IS 'Motivo (nodo raíz del catálogo de pausa) con el que se abrió la pausa.';


--
-- Name: ticket_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    score smallint NOT NULL,
    comment text,
    rated_by uuid,
    requester_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ticket_ratings_score_check CHECK (((score >= 1) AND (score <= 5)))
);


--
-- Name: TABLE ticket_ratings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_ratings IS 'Calificación de satisfacción por tiquet (1-5, opcional; RN de calificación).';


--
-- Name: ticket_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_validations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    cycle integer NOT NULL,
    validator_user_id uuid,
    validator_role text NOT NULL,
    validated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ticket_validations_cycle_check CHECK ((cycle > 0)),
    CONSTRAINT ticket_validations_validator_role_check CHECK ((validator_role = ANY (ARRAY['requester'::text, 'supervisor'::text])))
);


--
-- Name: TABLE ticket_validations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ticket_validations IS 'Validaciones por rol (requester/supervisor) para cumplir la política (RN-15).';


--
-- Name: tickets_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tickets_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number bigint DEFAULT nextval('public.tickets_number_seq'::regclass) NOT NULL,
    folio text NOT NULL,
    status public.ticket_status DEFAULT 'registered'::public.ticket_status NOT NULL,
    cycle integer DEFAULT 1 NOT NULL,
    team_id uuid NOT NULL,
    building_id uuid NOT NULL,
    location_id uuid NOT NULL,
    dependency_id uuid NOT NULL,
    category_id uuid NOT NULL,
    subcategory_id uuid,
    problem_id uuid,
    service_type_id uuid,
    priority_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    description text NOT NULL,
    requester_id uuid NOT NULL,
    requester_name text NOT NULL,
    requester_contact text,
    registered_by uuid,
    reported_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    possible_duplicate boolean DEFAULT false NOT NULL,
    duplicate_of_id uuid,
    status_before_discard public.ticket_status,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tickets_cycle_check CHECK ((cycle > 0))
);


--
-- Name: TABLE tickets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tickets IS 'Tiquets del núcleo. Ver docs/modelo-datos.md §3.4.';


--
-- Name: COLUMN tickets.folio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tickets.folio IS 'Folio legible por patrón; inmutable (RN-25).';


--
-- Name: COLUMN tickets.team_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tickets.team_id IS 'Instantánea del equipo de la categoría (RN-02).';


--
-- Name: COLUMN tickets.status_before_discard; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tickets.status_before_discard IS 'Estado previo al descarte, para la reactivación.';


--
-- Name: time_spans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_spans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    cycle integer NOT NULL,
    kind public.time_span_kind NOT NULL,
    ref_id uuid,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    clock_class public.clock_class DEFAULT 'counted'::public.clock_class NOT NULL,
    origin public.span_origin DEFAULT 'system'::public.span_origin NOT NULL,
    recorded_by uuid,
    client_request_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subject_technician_id uuid,
    voided_at timestamp with time zone,
    voided_by uuid,
    CONSTRAINT time_spans_check CHECK (((ended_at IS NULL) OR (ended_at >= started_at))),
    CONSTRAINT time_spans_cycle_check CHECK ((cycle > 0))
);


--
-- Name: TABLE time_spans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.time_spans IS 'Tramos de tiempo con inicio y fin. La clasificación de reloj se copia al crearse (RN §7).';


--
-- Name: COLUMN time_spans.subject_technician_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_spans.subject_technician_id IS 'Técnico al que pertenece el tramo manual (RN §13).';


--
-- Name: COLUMN time_spans.voided_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_spans.voided_at IS 'Marca de anulación de un tramo manual corregido; no cuenta en los indicadores.';


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_roles IS 'Roles de cada cuenta (una cuenta puede tener varios).';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    full_name text NOT NULL,
    phone text,
    password_hash text NOT NULL,
    must_change_password boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL,
    password_changed_at timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_username_format_check CHECK ((username ~ '^[a-z0-9][a-z0-9._-]{2,63}$'::text)),
    CONSTRAINT users_username_lower_check CHECK ((username = lower(username)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Cuentas de la aplicación (nombre visible, credenciales y estado).';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS 'Hash Argon2id; nunca se expone al cliente.';


--
-- Name: COLUMN users.must_change_password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.must_change_password IS 'Fuerza el cambio tras un restablecimiento administrativo.';


--
-- Name: v_metrics_aging; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_metrics_aging WITH (security_invoker='true') AS
 SELECT id,
    folio,
    status,
    team_id,
    category_id,
    priority_id,
    reported_at,
    (now() - reported_at) AS age,
    public.work_calendar_overlap(public.ticket_calendar(id), reported_at, now()) AS age_labor,
    public.ticket_time_by_kind(id, 'wait_start'::public.time_span_kind) AS wait_start_time,
    public.ticket_time_by_kind(id, 'pause'::public.time_span_kind) AS pause_time
   FROM public.tickets t
  WHERE (status <> ALL (ARRAY['closed'::public.ticket_status, 'rejected'::public.ticket_status, 'cancelled'::public.ticket_status, 'duplicate'::public.ticket_status]));


--
-- Name: VIEW v_metrics_aging; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_metrics_aging IS 'Antigüedad de los tiquets pendientes (calendario y laboral).';


--
-- Name: v_ticket_metrics_base; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ticket_metrics_base WITH (security_invoker='true') AS
 SELECT id,
    ticket_number,
    folio,
    status,
    building_id,
    category_id,
    priority_id,
    team_id,
    reported_at,
    closed_at,
    public.ticket_time_total(id) AS total_time,
    public.ticket_time_net(id) AS net_time,
    public.ticket_time_by_kind(id, 'active_work'::public.time_span_kind) AS active_work_time,
    public.ticket_time_total_laboral(id) AS total_time_labor,
    public.ticket_time_net_laboral(id) AS net_time_labor,
    public.ticket_time_by_kind_laboral(id, 'active_work'::public.time_span_kind) AS active_work_time_labor,
    public.ticket_time_by_kind(id, 'supervisor_response'::public.time_span_kind) AS response_time,
    public.ticket_time_by_kind_laboral(id, 'supervisor_response'::public.time_span_kind) AS response_time_labor,
    public.ticket_time_by_kind(id, 'technician_assignment'::public.time_span_kind) AS assignment_time,
    public.ticket_time_by_kind_laboral(id, 'technician_assignment'::public.time_span_kind) AS assignment_time_labor,
    public.ticket_time_by_kind(id, 'reassignment'::public.time_span_kind) AS reassignment_time,
    public.ticket_time_by_kind_laboral(id, 'reassignment'::public.time_span_kind) AS reassignment_time_labor,
    public.ticket_time_by_kind(id, 'wait_start'::public.time_span_kind) AS wait_start_time,
    public.ticket_time_by_kind_laboral(id, 'wait_start'::public.time_span_kind) AS wait_start_time_labor,
    public.ticket_time_by_kind(id, 'pause'::public.time_span_kind) AS pause_time,
    public.ticket_time_by_kind_laboral(id, 'pause'::public.time_span_kind) AS pause_time_labor,
    public.ticket_time_by_kind(id, 'validation'::public.time_span_kind) AS validation_time,
    public.ticket_time_by_kind_laboral(id, 'validation'::public.time_span_kind) AS validation_time_labor,
    public.ticket_time_by_kind(id, 'claim'::public.time_span_kind) AS claim_time,
    public.ticket_time_by_kind_laboral(id, 'claim'::public.time_span_kind) AS claim_time_labor,
    requester_id,
    dependency_id,
    (EXISTS ( SELECT 1
           FROM public.ticket_events e
          WHERE ((e.ticket_id = t.id) AND (e.type = 'reassigned_supervisor'::public.event_type)))) AS reassigned_supervisor,
    (EXISTS ( SELECT 1
           FROM public.ticket_events e
          WHERE ((e.ticket_id = t.id) AND (e.type = 'reassigned_technician'::public.event_type)))) AS reassigned_technician,
    (EXISTS ( SELECT 1
           FROM public.ticket_captures c
          WHERE (c.ticket_id = t.id))) AS recaptured,
    (EXISTS ( SELECT 1
           FROM public.ticket_events e
          WHERE ((e.ticket_id = t.id) AND (e.type = 'reopened'::public.event_type)))) AS reopened,
    (EXISTS ( SELECT 1
           FROM public.evidence ev
          WHERE ((ev.ticket_id = t.id) AND (ev.type = 'request'::public.evidence_type)))) AS has_request_evidence,
    (EXISTS ( SELECT 1
           FROM public.evidence ev
          WHERE ((ev.ticket_id = t.id) AND (ev.type = 'before'::public.evidence_type)))) AS has_before_evidence,
    (EXISTS ( SELECT 1
           FROM public.evidence ev
          WHERE ((ev.ticket_id = t.id) AND (ev.type = 'after'::public.evidence_type)))) AS has_after_evidence,
    (EXISTS ( SELECT 1
           FROM public.ticket_validations v
          WHERE ((v.ticket_id = t.id) AND (v.validator_role = 'requester'::text)))) AS validated_requester,
    (EXISTS ( SELECT 1
           FROM public.ticket_validations v
          WHERE ((v.ticket_id = t.id) AND (v.validator_role = 'supervisor'::text)))) AS validated_supervisor,
    ( SELECT count(*) AS count
           FROM public.ticket_captures c
          WHERE (c.ticket_id = t.id)) AS recapture_count,
    ( SELECT count(*) AS count
           FROM public.ticket_events e
          WHERE ((e.ticket_id = t.id) AND (e.type = 'reopened'::public.event_type))) AS reopen_count,
    ( SELECT count(*) AS count
           FROM public.ticket_participants p
          WHERE ((p.ticket_id = t.id) AND (p.participation_type = 'auxiliary'::public.participation_type))) AS auxiliary_count,
    ( SELECT sum((COALESCE(p.ended_at, now()) - p.started_at)) AS sum
           FROM public.ticket_participants p
          WHERE ((p.ticket_id = t.id) AND (p.participation_type = 'auxiliary'::public.participation_type))) AS auxiliary_time,
    public.ticket_time_by_kind_extra(id, 'active_work'::public.time_span_kind) AS active_work_time_extra
   FROM public.tickets t
  WHERE (status <> 'duplicate'::public.ticket_status);


--
-- Name: VIEW v_ticket_metrics_base; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ticket_metrics_base IS 'Indicadores base por tiquet (excluye duplicados): tiempos calendario y laboral, trabajo fuera de horario, marcas y conteos.';


--
-- Name: v_metrics_by_dimension; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_metrics_by_dimension WITH (security_invoker='true') AS
 SELECT
        CASE
            WHEN (GROUPING(m.team_id) = 0) THEN 'team'::text
            WHEN (GROUPING(m.category_id) = 0) THEN 'category'::text
            WHEN (GROUPING(m.building_id) = 0) THEN 'building'::text
            WHEN (GROUPING(m.dependency_id) = 0) THEN 'dependency'::text
            ELSE 'requester'::text
        END AS dimension,
    COALESCE(m.team_id, m.category_id, m.building_id, m.dependency_id, m.requester_id) AS dimension_id,
    COALESCE(tm.name, cat.name, bld.name, dep.name, req.full_name) AS dimension_name,
    count(*) AS tickets,
    count(*) FILTER (WHERE m.reassigned_supervisor) AS reassigned,
    count(*) FILTER (WHERE m.recaptured) AS recaptured,
    count(*) FILTER (WHERE m.reopened) AS reopened,
    round(((count(*) FILTER (WHERE m.reassigned_supervisor))::numeric / (NULLIF(count(*), 0))::numeric), 4) AS reassignment_rate,
    round(((count(*) FILTER (WHERE m.recaptured))::numeric / (NULLIF(count(*), 0))::numeric), 4) AS recapture_rate,
    round(((count(*) FILTER (WHERE m.reopened))::numeric / (NULLIF(count(*), 0))::numeric), 4) AS reopen_rate,
    round(((count(*) FILTER (WHERE ((m.status = 'closed'::public.ticket_status) AND (NOT m.reopened))))::numeric / (NULLIF(count(*) FILTER (WHERE (m.status = 'closed'::public.ticket_status)), 0))::numeric), 4) AS first_time_fix_rate,
    avg(m.response_time) AS avg_response_time,
    avg(m.assignment_time) AS avg_assignment_time,
    avg(m.reassignment_time) AS avg_reassignment_time,
    avg(m.wait_start_time) AS avg_wait_start_time,
    avg(m.active_work_time) AS avg_active_work_time,
    avg(m.pause_time) AS avg_pause_time,
    avg(m.validation_time) AS avg_validation_time,
    avg(m.total_time) AS avg_total_time,
    avg(m.net_time) AS avg_net_time,
    avg(m.total_time_labor) AS avg_total_time_labor,
    avg(m.net_time_labor) AS avg_net_time_labor,
    avg(m.active_work_time_labor) AS avg_active_work_time_labor
   FROM (((((public.v_ticket_metrics_base m
     LEFT JOIN public.teams tm ON ((tm.id = m.team_id)))
     LEFT JOIN public.categories cat ON ((cat.id = m.category_id)))
     LEFT JOIN public.buildings bld ON ((bld.id = m.building_id)))
     LEFT JOIN public.dependencies dep ON ((dep.id = m.dependency_id)))
     LEFT JOIN public.requesters req ON ((req.id = m.requester_id)))
  GROUP BY GROUPING SETS ((m.team_id, tm.name), (m.category_id, cat.name), (m.building_id, bld.name), (m.dependency_id, dep.name), (m.requester_id, req.full_name));


--
-- Name: VIEW v_metrics_by_dimension; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_metrics_by_dimension IS 'Indicadores de desempeño agregados por equipo, categoría, edificio, dependencia y solicitante.';


--
-- Name: v_metrics_by_technician; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_metrics_by_technician WITH (security_invoker='true') AS
 SELECT p.technician_id,
    tech.full_name AS technician_name,
    count(DISTINCT p.ticket_id) AS tickets,
    count(*) FILTER (WHERE (p.participation_type = 'leader'::public.participation_type)) AS leader_count,
    count(*) FILTER (WHERE (p.participation_type = 'auxiliary'::public.participation_type)) AS auxiliary_count,
    sum((COALESCE(p.ended_at, now()) - p.started_at)) AS participation_time,
    sum(public.work_calendar_overlap(public.ticket_calendar(p.ticket_id), p.started_at, COALESCE(p.ended_at, now()))) AS participation_time_labor,
    ( SELECT count(*) AS count
           FROM public.ticket_assignments a
          WHERE ((a.assignee_technician_id = p.technician_id) AND (a.stage = 'technician'::public.assignment_stage))) AS assigned_count,
    (sum((COALESCE(p.ended_at, now()) - p.started_at)) - sum(public.work_calendar_overlap(public.ticket_calendar(p.ticket_id), p.started_at, COALESCE(p.ended_at, now())))) AS participation_time_extra
   FROM (public.ticket_participants p
     JOIN public.technicians tech ON ((tech.id = p.technician_id)))
  GROUP BY p.technician_id, tech.full_name;


--
-- Name: VIEW v_metrics_by_technician; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_metrics_by_technician IS 'Carga por técnico y horas de apoyo auxiliar (calendario, laboral y fuera de horario).';


--
-- Name: v_metrics_duplicate_alerts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_metrics_duplicate_alerts WITH (security_invoker='true') AS
 SELECT COALESCE(decision, 'pending'::text) AS decision,
    count(*) AS candidates,
    count(DISTINCT ticket_id) AS tickets
   FROM public.ticket_duplicate_candidates c
  GROUP BY COALESCE(decision, 'pending'::text);


--
-- Name: VIEW v_metrics_duplicate_alerts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_metrics_duplicate_alerts IS 'Candidatos de posible duplicado por decisión (pendiente, ignorado, enlazado, descartado).';


--
-- Name: v_metrics_duplicate_tickets; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_metrics_duplicate_tickets WITH (security_invoker='true') AS
 SELECT id,
    building_id,
    category_id,
    team_id,
    dependency_id,
    requester_id,
    reported_at,
    ( SELECT min(e.occurred_at) AS min
           FROM public.ticket_events e
          WHERE ((e.ticket_id = t.id) AND (e.type = 'duplicate_marked'::public.event_type))) AS marked_at,
    (( SELECT min(e.occurred_at) AS min
           FROM public.ticket_events e
          WHERE ((e.ticket_id = t.id) AND (e.type = 'duplicate_marked'::public.event_type))) - reported_at) AS time_to_mark
   FROM public.tickets t
  WHERE (status = 'duplicate'::public.ticket_status);


--
-- Name: VIEW v_metrics_duplicate_tickets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_metrics_duplicate_tickets IS 'Tiquets duplicados con el tiempo desde el registro hasta marcarse.';


--
-- Name: v_metrics_duplicates_by_dimension; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_metrics_duplicates_by_dimension WITH (security_invoker='true') AS
 WITH agg AS (
         SELECT GROUPING(t.team_id) AS g_team,
            GROUPING(t.building_id) AS g_building,
            GROUPING(t.dependency_id) AS g_dependency,
            GROUPING(t.requester_id) AS g_requester,
            t.team_id,
            t.building_id,
            t.dependency_id,
            t.requester_id,
            count(*) AS tickets,
            count(*) FILTER (WHERE (t.status = 'duplicate'::public.ticket_status)) AS duplicates
           FROM public.tickets t
          GROUP BY GROUPING SETS ((t.team_id), (t.building_id), (t.dependency_id), (t.requester_id))
        )
 SELECT
        CASE
            WHEN (agg.g_team = 0) THEN 'team'::text
            WHEN (agg.g_building = 0) THEN 'building'::text
            WHEN (agg.g_dependency = 0) THEN 'dependency'::text
            ELSE 'requester'::text
        END AS dimension,
    COALESCE(agg.team_id, agg.building_id, agg.dependency_id, agg.requester_id) AS dimension_id,
    COALESCE(tm.name, bld.name, dep.name, req.full_name) AS dimension_name,
    agg.tickets,
    agg.duplicates,
    round(((agg.duplicates)::numeric / (NULLIF(agg.tickets, 0))::numeric), 4) AS duplicate_rate
   FROM ((((agg
     LEFT JOIN public.teams tm ON ((tm.id = agg.team_id)))
     LEFT JOIN public.buildings bld ON ((bld.id = agg.building_id)))
     LEFT JOIN public.dependencies dep ON ((dep.id = agg.dependency_id)))
     LEFT JOIN public.requesters req ON ((req.id = agg.requester_id)));


--
-- Name: VIEW v_metrics_duplicates_by_dimension; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_metrics_duplicates_by_dimension IS 'Tasa de duplicados por equipo, edificio, dependencia y solicitante.';


--
-- Name: v_metrics_pauses_by_reason; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_metrics_pauses_by_reason WITH (security_invoker='true') AS
 SELECT r.id AS reason_id,
    r.name AS reason_name,
    count(*) AS pauses,
    count(DISTINCT p.ticket_id) AS tickets,
    sum((COALESCE(p.closed_at, now()) - p.opened_at)) AS pause_time,
    sum(public.work_calendar_overlap(public.ticket_calendar(p.ticket_id), p.opened_at, COALESCE(p.closed_at, now()))) AS pause_time_labor
   FROM (public.ticket_pauses p
     JOIN public.reasons r ON ((r.id = p.reason_id)))
  GROUP BY r.id, r.name;


--
-- Name: VIEW v_metrics_pauses_by_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_metrics_pauses_by_reason IS 'Pausas por motivo con su tiempo en modo calendario y laboral.';


--
-- Name: v_metrics_reject_cancel_by_reason; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_metrics_reject_cancel_by_reason WITH (security_invoker='true') AS
 SELECT e.type AS event_type,
    r.id AS reason_id,
    r.name AS reason_name,
    count(*) AS tickets
   FROM (public.ticket_events e
     JOIN public.reasons r ON ((r.id = e.reason_id)))
  WHERE (e.type = ANY (ARRAY['rejected'::public.event_type, 'cancelled'::public.event_type]))
  GROUP BY e.type, r.id, r.name;


--
-- Name: VIEW v_metrics_reject_cancel_by_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_metrics_reject_cancel_by_reason IS 'Rechazos y cancelaciones agrupados por motivo.';


--
-- Name: v_metrics_routing; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_metrics_routing WITH (security_invoker='true') AS
 SELECT id,
    folio,
    status,
    building_id,
    team_id,
    reported_at,
    ( SELECT count(*) AS count
           FROM public.ticket_offers o
          WHERE (o.ticket_id = t.id)) AS offers_count,
    ( SELECT count(*) AS count
           FROM public.ticket_offers o
          WHERE ((o.ticket_id = t.id) AND (o.status = 'offered'::public.offer_status))) AS pending_offers,
    ( SELECT count(*) AS count
           FROM public.ticket_offers o
          WHERE ((o.ticket_id = t.id) AND (o.status = 'taken'::public.offer_status))) AS taken_offers,
    (( SELECT min(o.resolved_at) AS min
           FROM public.ticket_offers o
          WHERE ((o.ticket_id = t.id) AND (o.status = 'taken'::public.offer_status))) - reported_at) AS time_to_take
   FROM public.tickets t;


--
-- Name: VIEW v_metrics_routing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_metrics_routing IS 'Estado de ruteo por tiquet: sin candidatos, ofertas pendientes y tiempo hasta la toma.';


--
-- Name: v_metrics_satisfaction; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_metrics_satisfaction WITH (security_invoker='true') AS
 SELECT round(avg(score), 3) AS average_score,
    count(*) AS ratings,
    count(*) FILTER (WHERE (score = 1)) AS score_1,
    count(*) FILTER (WHERE (score = 2)) AS score_2,
    count(*) FILTER (WHERE (score = 3)) AS score_3,
    count(*) FILTER (WHERE (score = 4)) AS score_4,
    count(*) FILTER (WHERE (score = 5)) AS score_5
   FROM public.ticket_ratings r;


--
-- Name: VIEW v_metrics_satisfaction; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_metrics_satisfaction IS 'Satisfacción promedio y distribución de las calificaciones.';


--
-- Name: v_ticket_sla; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ticket_sla WITH (security_invoker='true') AS
 WITH base AS (
         SELECT t.id,
            t.ticket_number,
            t.folio,
            t.status,
            t.description,
            t.priority_id,
            t.service_type_id,
            t.building_id,
            t.category_id,
            t.team_id,
            t.reported_at,
            t.closed_at,
            COALESCE(st.target_minutes, pr.target_minutes) AS target_minutes,
                CASE
                    WHEN (t.closed_at IS NULL) THEN NULL::numeric
                    WHEN (( SELECT instance_settings.sla_clock_mode
                       FROM public.instance_settings
                     LIMIT 1) = 'laboral'::text) THEN (EXTRACT(epoch FROM public.ticket_time_total_laboral(t.id)) / (60)::numeric)
                    ELSE (EXTRACT(epoch FROM (t.closed_at - t.reported_at)) / (60)::numeric)
                END AS resolution_minutes
           FROM ((public.tickets t
             LEFT JOIN public.service_types st ON ((st.id = t.service_type_id)))
             LEFT JOIN public.priorities pr ON ((pr.id = t.priority_id)))
          WHERE (t.status <> 'duplicate'::public.ticket_status)
        )
 SELECT id,
    ticket_number,
    folio,
    status,
    description,
    priority_id,
    service_type_id,
    building_id,
    category_id,
    team_id,
    reported_at,
    closed_at,
    target_minutes,
    resolution_minutes,
        CASE
            WHEN ((resolution_minutes IS NOT NULL) AND (target_minutes IS NOT NULL)) THEN (resolution_minutes <= (target_minutes)::numeric)
            ELSE NULL::boolean
        END AS meets
   FROM base;


--
-- Name: VIEW v_ticket_sla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ticket_sla IS 'Cumplimiento de tiempos objetivo por tiquet (resolución en el modo de reloj de la instancia).';


--
-- Name: v_metrics_sla; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_metrics_sla WITH (security_invoker='true') AS
 SELECT count(*) FILTER (WHERE ((target_minutes IS NOT NULL) AND (closed_at IS NOT NULL))) AS with_target,
    count(*) FILTER (WHERE meets) AS met,
    round(((count(*) FILTER (WHERE meets))::numeric / (NULLIF(count(*) FILTER (WHERE ((target_minutes IS NOT NULL) AND (closed_at IS NOT NULL))), 0))::numeric), 4) AS compliance_rate,
    avg(target_minutes) FILTER (WHERE ((target_minutes IS NOT NULL) AND (closed_at IS NOT NULL))) AS avg_target_minutes,
    avg(resolution_minutes) FILTER (WHERE ((target_minutes IS NOT NULL) AND (closed_at IS NOT NULL))) AS avg_resolution_minutes
   FROM public.v_ticket_sla;


--
-- Name: VIEW v_metrics_sla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_metrics_sla IS 'Cumplimiento global de tiempos objetivo (tiquets cerrados con objetivo).';


--
-- Name: v_metrics_sla_by_priority; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_metrics_sla_by_priority WITH (security_invoker='true') AS
 SELECT pr.id AS priority_id,
    pr.name AS priority_name,
    count(*) FILTER (WHERE ((s.target_minutes IS NOT NULL) AND (s.closed_at IS NOT NULL))) AS with_target,
    count(*) FILTER (WHERE s.meets) AS met,
    round(((count(*) FILTER (WHERE s.meets))::numeric / (NULLIF(count(*) FILTER (WHERE ((s.target_minutes IS NOT NULL) AND (s.closed_at IS NOT NULL))), 0))::numeric), 4) AS compliance_rate
   FROM (public.v_ticket_sla s
     JOIN public.priorities pr ON ((pr.id = s.priority_id)))
  GROUP BY pr.id, pr.name;


--
-- Name: VIEW v_metrics_sla_by_priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_metrics_sla_by_priority IS 'Cumplimiento de tiempos objetivo por prioridad.';


--
-- Name: v_ticket_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ticket_timeline WITH (security_invoker='true') AS
 SELECT e.id,
    e.ticket_id,
    e.cycle,
    e.type,
    e.payload,
    e.occurred_at,
    e.recorded_at,
    e.actor_id,
    actor.full_name AS actor_name,
    e.subject_user_id,
    subject.full_name AS subject_user_name,
    e.subject_technician_id,
    technician.full_name AS subject_technician_name,
    e.reason_id,
    reason.name AS reason_name
   FROM ((((public.ticket_events e
     LEFT JOIN public.users actor ON ((actor.id = e.actor_id)))
     LEFT JOIN public.users subject ON ((subject.id = e.subject_user_id)))
     LEFT JOIN public.technicians technician ON ((technician.id = e.subject_technician_id)))
     LEFT JOIN public.reasons reason ON ((reason.id = e.reason_id)));


--
-- Name: VIEW v_ticket_timeline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ticket_timeline IS 'Línea de tiempo del tiquet con nombres; la visibilidad se aplica en la API.';


--
-- Name: work_calendar_holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_calendar_holidays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calendar_id uuid NOT NULL,
    holiday date NOT NULL,
    name text
);


--
-- Name: TABLE work_calendar_holidays; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.work_calendar_holidays IS 'Días no laborables del calendario.';


--
-- Name: work_calendar_intervals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_calendar_intervals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calendar_id uuid NOT NULL,
    weekday smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    CONSTRAINT work_calendar_intervals_check CHECK ((start_time < end_time)),
    CONSTRAINT work_calendar_intervals_weekday_check CHECK (((weekday >= 0) AND (weekday <= 6)))
);


--
-- Name: TABLE work_calendar_intervals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.work_calendar_intervals IS 'Franjas semanales del calendario (0=domingo … 6=sábado).';


--
-- Name: work_calendars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_calendars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    timezone text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE work_calendars; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.work_calendars IS 'Jornadas laborales configurables (turnos).';


--
-- Name: buildings buildings_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_name_key UNIQUE (name);


--
-- Name: buildings buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_pkey PRIMARY KEY (id);


--
-- Name: catalog_aliases catalog_aliases_catalog_alias_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_aliases
    ADD CONSTRAINT catalog_aliases_catalog_alias_key UNIQUE (catalog, alias);


--
-- Name: catalog_aliases catalog_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_aliases
    ADD CONSTRAINT catalog_aliases_pkey PRIMARY KEY (id);


--
-- Name: catalog_import_rows catalog_import_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_import_rows
    ADD CONSTRAINT catalog_import_rows_pkey PRIMARY KEY (id);


--
-- Name: catalog_import_runs catalog_import_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_import_runs
    ADD CONSTRAINT catalog_import_runs_pkey PRIMARY KEY (id);


--
-- Name: catalog_import_specs catalog_import_specs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_import_specs
    ADD CONSTRAINT catalog_import_specs_pkey PRIMARY KEY (catalog_key);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_team_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_team_id_name_key UNIQUE (team_id, name);


--
-- Name: channels channels_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_name_key UNIQUE (name);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: dependencies dependencies_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_name_key UNIQUE (name);


--
-- Name: dependencies dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_pkey PRIMARY KEY (id);


--
-- Name: escalation_rules escalation_rules_condition_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_rules
    ADD CONSTRAINT escalation_rules_condition_key UNIQUE (condition);


--
-- Name: escalation_rules escalation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escalation_rules
    ADD CONSTRAINT escalation_rules_pkey PRIMARY KEY (id);


--
-- Name: evidence evidence_client_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence
    ADD CONSTRAINT evidence_client_request_id_key UNIQUE (client_request_id);


--
-- Name: evidence evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence
    ADD CONSTRAINT evidence_pkey PRIMARY KEY (id);


--
-- Name: external_systems external_systems_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_systems
    ADD CONSTRAINT external_systems_name_key UNIQUE (name);


--
-- Name: external_systems external_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_systems
    ADD CONSTRAINT external_systems_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (client_request_id);


--
-- Name: import_batches import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_pkey PRIMARY KEY (id);


--
-- Name: import_records import_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_records
    ADD CONSTRAINT import_records_pkey PRIMARY KEY (id);


--
-- Name: import_status_map import_status_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_status_map
    ADD CONSTRAINT import_status_map_pkey PRIMARY KEY (id);


--
-- Name: import_status_map import_status_map_system_external_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_status_map
    ADD CONSTRAINT import_status_map_system_external_status_key UNIQUE (system, external_status);


--
-- Name: instance_settings instance_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instance_settings
    ADD CONSTRAINT instance_settings_pkey PRIMARY KEY (id);


--
-- Name: instance_settings instance_settings_singleton_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instance_settings
    ADD CONSTRAINT instance_settings_singleton_key UNIQUE (singleton);


--
-- Name: integration_tasks integration_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_tasks
    ADD CONSTRAINT integration_tasks_pkey PRIMARY KEY (id);


--
-- Name: locations locations_building_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_building_id_name_key UNIQUE (building_id, name);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: notification_deliveries notification_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_deliveries
    ADD CONSTRAINT notification_deliveries_pkey PRIMARY KEY (id);


--
-- Name: notification_rules notification_rules_event_type_recipient_channel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_rules
    ADD CONSTRAINT notification_rules_event_type_recipient_channel_key UNIQUE (event_type, recipient, channel);


--
-- Name: notification_rules notification_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_rules
    ADD CONSTRAINT notification_rules_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: priorities priorities_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.priorities
    ADD CONSTRAINT priorities_name_key UNIQUE (name);


--
-- Name: priorities priorities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.priorities
    ADD CONSTRAINT priorities_pkey PRIMARY KEY (id);


--
-- Name: problems problems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.problems
    ADD CONSTRAINT problems_pkey PRIMARY KEY (id);


--
-- Name: problems problems_subcategory_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.problems
    ADD CONSTRAINT problems_subcategory_id_name_key UNIQUE (subcategory_id, name);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: reasons reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reasons
    ADD CONSTRAINT reasons_pkey PRIMARY KEY (id);


--
-- Name: reasons reasons_use_parent_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reasons
    ADD CONSTRAINT reasons_use_parent_id_name_key UNIQUE NULLS NOT DISTINCT (use, parent_id, name);


--
-- Name: requesters requesters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requesters
    ADD CONSTRAINT requesters_pkey PRIMARY KEY (id);


--
-- Name: requesters requesters_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requesters
    ADD CONSTRAINT requesters_user_id_key UNIQUE (user_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: service_types service_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_types
    ADD CONSTRAINT service_types_name_key UNIQUE (name);


--
-- Name: service_types service_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_types
    ADD CONSTRAINT service_types_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: subcategories subcategories_category_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_name_key UNIQUE (category_id, name);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: supervisor_scope_buildings supervisor_scope_buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supervisor_scope_buildings
    ADD CONSTRAINT supervisor_scope_buildings_pkey PRIMARY KEY (scope_id, building_id);


--
-- Name: supervisor_scopes supervisor_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supervisor_scopes
    ADD CONSTRAINT supervisor_scopes_pkey PRIMARY KEY (id);


--
-- Name: supervisor_scopes supervisor_scopes_user_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supervisor_scopes
    ADD CONSTRAINT supervisor_scopes_user_id_team_id_key UNIQUE (user_id, team_id);


--
-- Name: teams teams_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_name_key UNIQUE (name);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: technician_categories technician_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technician_categories
    ADD CONSTRAINT technician_categories_pkey PRIMARY KEY (technician_id, category_id);


--
-- Name: technicians technicians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_pkey PRIMARY KEY (id);


--
-- Name: technicians technicians_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_user_id_key UNIQUE (user_id);


--
-- Name: ticket_assignments ticket_assignments_client_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_assignments
    ADD CONSTRAINT ticket_assignments_client_request_id_key UNIQUE (client_request_id);


--
-- Name: ticket_assignments ticket_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_assignments
    ADD CONSTRAINT ticket_assignments_pkey PRIMARY KEY (id);


--
-- Name: ticket_captures ticket_captures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_captures
    ADD CONSTRAINT ticket_captures_pkey PRIMARY KEY (id);


--
-- Name: ticket_claims ticket_claims_client_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_claims
    ADD CONSTRAINT ticket_claims_client_request_id_key UNIQUE (client_request_id);


--
-- Name: ticket_claims ticket_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_claims
    ADD CONSTRAINT ticket_claims_pkey PRIMARY KEY (id);


--
-- Name: ticket_duplicate_candidates ticket_duplicate_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_duplicate_candidates
    ADD CONSTRAINT ticket_duplicate_candidates_pkey PRIMARY KEY (id);


--
-- Name: ticket_duplicate_candidates ticket_duplicate_candidates_ticket_id_candidate_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_duplicate_candidates
    ADD CONSTRAINT ticket_duplicate_candidates_ticket_id_candidate_ticket_id_key UNIQUE (ticket_id, candidate_ticket_id);


--
-- Name: ticket_events ticket_events_client_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_events
    ADD CONSTRAINT ticket_events_client_request_id_key UNIQUE (client_request_id);


--
-- Name: ticket_events ticket_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_events
    ADD CONSTRAINT ticket_events_pkey PRIMARY KEY (id);


--
-- Name: ticket_external_refs ticket_external_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_external_refs
    ADD CONSTRAINT ticket_external_refs_pkey PRIMARY KEY (id);


--
-- Name: ticket_external_refs ticket_external_refs_system_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_external_refs
    ADD CONSTRAINT ticket_external_refs_system_external_id_key UNIQUE (system, external_id);


--
-- Name: ticket_links ticket_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_links
    ADD CONSTRAINT ticket_links_pkey PRIMARY KEY (id);


--
-- Name: ticket_links ticket_links_ticket_id_linked_ticket_id_link_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_links
    ADD CONSTRAINT ticket_links_ticket_id_linked_ticket_id_link_type_key UNIQUE (ticket_id, linked_ticket_id, link_type);


--
-- Name: ticket_offers ticket_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_offers
    ADD CONSTRAINT ticket_offers_pkey PRIMARY KEY (id);


--
-- Name: ticket_offers ticket_offers_ticket_id_cycle_supervisor_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_offers
    ADD CONSTRAINT ticket_offers_ticket_id_cycle_supervisor_user_id_key UNIQUE (ticket_id, cycle, supervisor_user_id);


--
-- Name: ticket_participants ticket_participants_client_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_participants
    ADD CONSTRAINT ticket_participants_client_request_id_key UNIQUE (client_request_id);


--
-- Name: ticket_participants ticket_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_participants
    ADD CONSTRAINT ticket_participants_pkey PRIMARY KEY (id);


--
-- Name: ticket_pause_steps ticket_pause_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_pause_steps
    ADD CONSTRAINT ticket_pause_steps_pkey PRIMARY KEY (id);


--
-- Name: ticket_pauses ticket_pauses_client_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_pauses
    ADD CONSTRAINT ticket_pauses_client_request_id_key UNIQUE (client_request_id);


--
-- Name: ticket_pauses ticket_pauses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_pauses
    ADD CONSTRAINT ticket_pauses_pkey PRIMARY KEY (id);


--
-- Name: ticket_ratings ticket_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_ratings
    ADD CONSTRAINT ticket_ratings_pkey PRIMARY KEY (id);


--
-- Name: ticket_ratings ticket_ratings_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_ratings
    ADD CONSTRAINT ticket_ratings_ticket_id_key UNIQUE (ticket_id);


--
-- Name: ticket_validations ticket_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_validations
    ADD CONSTRAINT ticket_validations_pkey PRIMARY KEY (id);


--
-- Name: ticket_validations ticket_validations_ticket_id_cycle_validator_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_validations
    ADD CONSTRAINT ticket_validations_ticket_id_cycle_validator_role_key UNIQUE (ticket_id, cycle, validator_role);


--
-- Name: tickets tickets_folio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_folio_key UNIQUE (folio);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_number_key UNIQUE (ticket_number);


--
-- Name: time_spans time_spans_client_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_spans
    ADD CONSTRAINT time_spans_client_request_id_key UNIQUE (client_request_id);


--
-- Name: time_spans time_spans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_spans
    ADD CONSTRAINT time_spans_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_calendar_holidays work_calendar_holidays_calendar_id_holiday_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_calendar_holidays
    ADD CONSTRAINT work_calendar_holidays_calendar_id_holiday_key UNIQUE (calendar_id, holiday);


--
-- Name: work_calendar_holidays work_calendar_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_calendar_holidays
    ADD CONSTRAINT work_calendar_holidays_pkey PRIMARY KEY (id);


--
-- Name: work_calendar_intervals work_calendar_intervals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_calendar_intervals
    ADD CONSTRAINT work_calendar_intervals_pkey PRIMARY KEY (id);


--
-- Name: work_calendars work_calendars_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_calendars
    ADD CONSTRAINT work_calendars_name_key UNIQUE (name);


--
-- Name: work_calendars work_calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_calendars
    ADD CONSTRAINT work_calendars_pkey PRIMARY KEY (id);


--
-- Name: idx_catalog_import_rows_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_catalog_import_rows_run ON public.catalog_import_rows USING btree (run_id, catalog_key, result);


--
-- Name: idx_evidence_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidence_ticket ON public.evidence USING btree (ticket_id);


--
-- Name: idx_evidence_ticket_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidence_ticket_type ON public.evidence USING btree (ticket_id, type);


--
-- Name: idx_import_records_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_records_batch ON public.import_records USING btree (batch_id, result);


--
-- Name: idx_integration_tasks_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_tasks_ticket ON public.integration_tasks USING btree (ticket_id, status);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_user_id, read_at);


--
-- Name: idx_notifications_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_ticket ON public.notifications USING btree (ticket_id);


--
-- Name: idx_push_subscriptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_ticket_assignments_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_assignments_ticket ON public.ticket_assignments USING btree (ticket_id);


--
-- Name: idx_ticket_claims_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_claims_ticket ON public.ticket_claims USING btree (ticket_id);


--
-- Name: idx_ticket_duplicate_candidates_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_duplicate_candidates_ticket ON public.ticket_duplicate_candidates USING btree (ticket_id);


--
-- Name: idx_ticket_events_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_events_ticket ON public.ticket_events USING btree (ticket_id);


--
-- Name: idx_ticket_events_ticket_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_events_ticket_type ON public.ticket_events USING btree (ticket_id, type);


--
-- Name: idx_ticket_links_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_links_ticket ON public.ticket_links USING btree (ticket_id);


--
-- Name: idx_ticket_offers_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_offers_ticket ON public.ticket_offers USING btree (ticket_id, cycle);


--
-- Name: idx_ticket_participants_technician; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_participants_technician ON public.ticket_participants USING btree (technician_id);


--
-- Name: idx_ticket_participants_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_participants_ticket ON public.ticket_participants USING btree (ticket_id);


--
-- Name: idx_tickets_building; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_building ON public.tickets USING btree (building_id);


--
-- Name: idx_tickets_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_category ON public.tickets USING btree (category_id);


--
-- Name: idx_tickets_description_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_description_trgm ON public.tickets USING gin (description extensions.gin_trgm_ops);


--
-- Name: idx_tickets_reported_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_reported_at ON public.tickets USING btree (reported_at);


--
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);


--
-- Name: idx_tickets_status_reported; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_status_reported ON public.tickets USING btree (status, reported_at);


--
-- Name: idx_time_spans_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_spans_kind ON public.time_spans USING btree (ticket_id, kind);


--
-- Name: idx_time_spans_manual; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_spans_manual ON public.time_spans USING btree (ticket_id, origin);


--
-- Name: idx_time_spans_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_spans_ticket ON public.time_spans USING btree (ticket_id, cycle);


--
-- Name: login_attempts_user_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX login_attempts_user_time_idx ON public.login_attempts USING btree (user_id, attempted_at DESC);


--
-- Name: login_attempts_username_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX login_attempts_username_time_idx ON public.login_attempts USING btree (username, attempted_at DESC);


--
-- Name: notification_deliveries_notification_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_deliveries_notification_idx ON public.notification_deliveries USING btree (notification_id);


--
-- Name: notification_deliveries_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_deliveries_pending_idx ON public.notification_deliveries USING btree (next_attempt_at) WHERE (status = 'pending'::text);


--
-- Name: sessions_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_expires_at_idx ON public.sessions USING btree (expires_at);


--
-- Name: sessions_idle_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_idle_expires_at_idx ON public.sessions USING btree (idle_expires_at);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_idx ON public.sessions USING btree (user_id);


--
-- Name: ticket_participants_active_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ticket_participants_active_unique ON public.ticket_participants USING btree (ticket_id, technician_id) WHERE (ended_at IS NULL);


--
-- Name: ticket_pauses_one_open; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ticket_pauses_one_open ON public.ticket_pauses USING btree (ticket_id) WHERE (closed_at IS NULL);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: buildings buildings_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER buildings_set_updated_at BEFORE UPDATE ON public.buildings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: categories categories_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: channels channels_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER channels_set_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: dependencies dependencies_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dependencies_set_updated_at BEFORE UPDATE ON public.dependencies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: evidence evidence_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER evidence_no_delete BEFORE DELETE ON public.evidence FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();


--
-- Name: external_systems external_systems_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER external_systems_set_updated_at BEFORE UPDATE ON public.external_systems FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: instance_settings instance_settings_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER instance_settings_set_updated_at BEFORE UPDATE ON public.instance_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: integration_tasks integration_tasks_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER integration_tasks_set_updated_at BEFORE UPDATE ON public.integration_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: locations locations_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER locations_set_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: notification_deliveries notification_deliveries_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notification_deliveries_set_updated_at BEFORE UPDATE ON public.notification_deliveries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: priorities priorities_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER priorities_set_updated_at BEFORE UPDATE ON public.priorities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: problems problems_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER problems_set_updated_at BEFORE UPDATE ON public.problems FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: push_subscriptions push_subscriptions_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER push_subscriptions_set_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: reasons reasons_enforce_same_use; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reasons_enforce_same_use BEFORE INSERT OR UPDATE ON public.reasons FOR EACH ROW EXECUTE FUNCTION public.reasons_enforce_same_use();


--
-- Name: reasons reasons_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reasons_set_updated_at BEFORE UPDATE ON public.reasons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: requesters requesters_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER requesters_set_updated_at BEFORE UPDATE ON public.requesters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: roles roles_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER roles_set_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: service_types service_types_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER service_types_set_updated_at BEFORE UPDATE ON public.service_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subcategories subcategories_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER subcategories_set_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: supervisor_scopes supervisor_scopes_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER supervisor_scopes_set_updated_at BEFORE UPDATE ON public.supervisor_scopes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: teams teams_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER teams_set_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: technicians technicians_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER technicians_set_updated_at BEFORE UPDATE ON public.technicians FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ticket_events ticket_events_no_mutation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ticket_events_no_mutation BEFORE DELETE OR UPDATE ON public.ticket_events FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();


--
-- Name: ticket_events ticket_events_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ticket_events_notify AFTER INSERT ON public.ticket_events FOR EACH ROW EXECUTE FUNCTION public.ticket_events_notify();


--
-- Name: ticket_events ticket_events_record_spans; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ticket_events_record_spans AFTER INSERT ON public.ticket_events FOR EACH ROW EXECUTE FUNCTION public.ticket_events_record_spans();


--
-- Name: tickets tickets_check_classification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tickets_check_classification BEFORE INSERT OR UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.tickets_check_classification();


--
-- Name: tickets tickets_close_participants; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tickets_close_participants AFTER UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.tickets_close_participants();


--
-- Name: tickets tickets_immutable_fields; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tickets_immutable_fields BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.tickets_immutable_fields();


--
-- Name: tickets tickets_set_folio; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tickets_set_folio BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.tickets_set_folio();


--
-- Name: tickets tickets_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tickets_set_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users users_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: work_calendars work_calendars_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER work_calendars_set_updated_at BEFORE UPDATE ON public.work_calendars FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: catalog_import_rows catalog_import_rows_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_import_rows
    ADD CONSTRAINT catalog_import_rows_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.catalog_import_runs(id) ON DELETE CASCADE;


--
-- Name: catalog_import_runs catalog_import_runs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_import_runs
    ADD CONSTRAINT catalog_import_runs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: categories categories_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: evidence evidence_captured_by_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence
    ADD CONSTRAINT evidence_captured_by_technician_id_fkey FOREIGN KEY (captured_by_technician_id) REFERENCES public.technicians(id);


--
-- Name: evidence evidence_captured_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence
    ADD CONSTRAINT evidence_captured_by_user_id_fkey FOREIGN KEY (captured_by_user_id) REFERENCES public.users(id);


--
-- Name: evidence evidence_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence
    ADD CONSTRAINT evidence_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.ticket_events(id);


--
-- Name: evidence evidence_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence
    ADD CONSTRAINT evidence_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: evidence evidence_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence
    ADD CONSTRAINT evidence_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: idempotency_keys idempotency_keys_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: import_batches import_batches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: import_batches import_batches_system_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_system_fkey FOREIGN KEY (system) REFERENCES public.external_systems(name);


--
-- Name: import_records import_records_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_records
    ADD CONSTRAINT import_records_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.import_batches(id) ON DELETE CASCADE;


--
-- Name: import_records import_records_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_records
    ADD CONSTRAINT import_records_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);


--
-- Name: import_status_map import_status_map_system_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_status_map
    ADD CONSTRAINT import_status_map_system_fkey FOREIGN KEY (system) REFERENCES public.external_systems(name);


--
-- Name: instance_settings instance_settings_default_calendar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instance_settings
    ADD CONSTRAINT instance_settings_default_calendar_id_fkey FOREIGN KEY (default_calendar_id) REFERENCES public.work_calendars(id);


--
-- Name: instance_settings instance_settings_default_priority_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instance_settings
    ADD CONSTRAINT instance_settings_default_priority_id_fkey FOREIGN KEY (default_priority_id) REFERENCES public.priorities(id);


--
-- Name: integration_tasks integration_tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_tasks
    ADD CONSTRAINT integration_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: integration_tasks integration_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_tasks
    ADD CONSTRAINT integration_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: integration_tasks integration_tasks_system_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_tasks
    ADD CONSTRAINT integration_tasks_system_fkey FOREIGN KEY (system) REFERENCES public.external_systems(name);


--
-- Name: integration_tasks integration_tasks_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_tasks
    ADD CONSTRAINT integration_tasks_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: locations locations_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id);


--
-- Name: login_attempts login_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notification_deliveries notification_deliveries_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_deliveries
    ADD CONSTRAINT notification_deliveries_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.ticket_events(id);


--
-- Name: notifications notifications_recipient_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_requester_id_fkey FOREIGN KEY (recipient_requester_id) REFERENCES public.requesters(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: problems problems_default_priority_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.problems
    ADD CONSTRAINT problems_default_priority_id_fkey FOREIGN KEY (default_priority_id) REFERENCES public.priorities(id);


--
-- Name: problems problems_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.problems
    ADD CONSTRAINT problems_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id);


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reasons reasons_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reasons
    ADD CONSTRAINT reasons_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.reasons(id);


--
-- Name: requesters requesters_dependency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requesters
    ADD CONSTRAINT requesters_dependency_id_fkey FOREIGN KEY (dependency_id) REFERENCES public.dependencies(id);


--
-- Name: requesters requesters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requesters
    ADD CONSTRAINT requesters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: supervisor_scope_buildings supervisor_scope_buildings_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supervisor_scope_buildings
    ADD CONSTRAINT supervisor_scope_buildings_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id);


--
-- Name: supervisor_scope_buildings supervisor_scope_buildings_scope_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supervisor_scope_buildings
    ADD CONSTRAINT supervisor_scope_buildings_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES public.supervisor_scopes(id) ON DELETE CASCADE;


--
-- Name: supervisor_scopes supervisor_scopes_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supervisor_scopes
    ADD CONSTRAINT supervisor_scopes_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: supervisor_scopes supervisor_scopes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supervisor_scopes
    ADD CONSTRAINT supervisor_scopes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_work_calendar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_work_calendar_id_fkey FOREIGN KEY (work_calendar_id) REFERENCES public.work_calendars(id);


--
-- Name: technician_categories technician_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technician_categories
    ADD CONSTRAINT technician_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: technician_categories technician_categories_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technician_categories
    ADD CONSTRAINT technician_categories_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.technicians(id) ON DELETE CASCADE;


--
-- Name: technicians technicians_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: technicians technicians_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.technicians
    ADD CONSTRAINT technicians_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ticket_assignments ticket_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_assignments
    ADD CONSTRAINT ticket_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: ticket_assignments ticket_assignments_assignee_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_assignments
    ADD CONSTRAINT ticket_assignments_assignee_technician_id_fkey FOREIGN KEY (assignee_technician_id) REFERENCES public.technicians(id);


--
-- Name: ticket_assignments ticket_assignments_assignee_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_assignments
    ADD CONSTRAINT ticket_assignments_assignee_user_id_fkey FOREIGN KEY (assignee_user_id) REFERENCES public.users(id);


--
-- Name: ticket_assignments ticket_assignments_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_assignments
    ADD CONSTRAINT ticket_assignments_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.reasons(id);


--
-- Name: ticket_assignments ticket_assignments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_assignments
    ADD CONSTRAINT ticket_assignments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_captures ticket_captures_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_captures
    ADD CONSTRAINT ticket_captures_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: ticket_captures ticket_captures_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_captures
    ADD CONSTRAINT ticket_captures_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.reasons(id);


--
-- Name: ticket_captures ticket_captures_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_captures
    ADD CONSTRAINT ticket_captures_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_claims ticket_claims_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_claims
    ADD CONSTRAINT ticket_claims_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.users(id);


--
-- Name: ticket_claims ticket_claims_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_claims
    ADD CONSTRAINT ticket_claims_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.reasons(id);


--
-- Name: ticket_claims ticket_claims_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_claims
    ADD CONSTRAINT ticket_claims_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: ticket_claims ticket_claims_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_claims
    ADD CONSTRAINT ticket_claims_result_id_fkey FOREIGN KEY (result_id) REFERENCES public.reasons(id);


--
-- Name: ticket_claims ticket_claims_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_claims
    ADD CONSTRAINT ticket_claims_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_duplicate_candidates ticket_duplicate_candidates_candidate_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_duplicate_candidates
    ADD CONSTRAINT ticket_duplicate_candidates_candidate_ticket_id_fkey FOREIGN KEY (candidate_ticket_id) REFERENCES public.tickets(id);


--
-- Name: ticket_duplicate_candidates ticket_duplicate_candidates_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_duplicate_candidates
    ADD CONSTRAINT ticket_duplicate_candidates_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_events ticket_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_events
    ADD CONSTRAINT ticket_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: ticket_events ticket_events_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_events
    ADD CONSTRAINT ticket_events_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.reasons(id);


--
-- Name: ticket_events ticket_events_subject_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_events
    ADD CONSTRAINT ticket_events_subject_technician_id_fkey FOREIGN KEY (subject_technician_id) REFERENCES public.technicians(id);


--
-- Name: ticket_events ticket_events_subject_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_events
    ADD CONSTRAINT ticket_events_subject_user_id_fkey FOREIGN KEY (subject_user_id) REFERENCES public.users(id);


--
-- Name: ticket_events ticket_events_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_events
    ADD CONSTRAINT ticket_events_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_external_refs ticket_external_refs_system_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_external_refs
    ADD CONSTRAINT ticket_external_refs_system_fkey FOREIGN KEY (system) REFERENCES public.external_systems(name);


--
-- Name: ticket_external_refs ticket_external_refs_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_external_refs
    ADD CONSTRAINT ticket_external_refs_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_links ticket_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_links
    ADD CONSTRAINT ticket_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: ticket_links ticket_links_linked_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_links
    ADD CONSTRAINT ticket_links_linked_ticket_id_fkey FOREIGN KEY (linked_ticket_id) REFERENCES public.tickets(id);


--
-- Name: ticket_links ticket_links_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_links
    ADD CONSTRAINT ticket_links_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_offers ticket_offers_supervisor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_offers
    ADD CONSTRAINT ticket_offers_supervisor_user_id_fkey FOREIGN KEY (supervisor_user_id) REFERENCES public.users(id);


--
-- Name: ticket_offers ticket_offers_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_offers
    ADD CONSTRAINT ticket_offers_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_participants ticket_participants_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_participants
    ADD CONSTRAINT ticket_participants_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: ticket_participants ticket_participants_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_participants
    ADD CONSTRAINT ticket_participants_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: ticket_participants ticket_participants_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_participants
    ADD CONSTRAINT ticket_participants_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.technicians(id);


--
-- Name: ticket_participants ticket_participants_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_participants
    ADD CONSTRAINT ticket_participants_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_pause_steps ticket_pause_steps_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_pause_steps
    ADD CONSTRAINT ticket_pause_steps_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: ticket_pause_steps ticket_pause_steps_pause_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_pause_steps
    ADD CONSTRAINT ticket_pause_steps_pause_id_fkey FOREIGN KEY (pause_id) REFERENCES public.ticket_pauses(id) ON DELETE CASCADE;


--
-- Name: ticket_pause_steps ticket_pause_steps_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_pause_steps
    ADD CONSTRAINT ticket_pause_steps_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.reasons(id);


--
-- Name: ticket_pauses ticket_pauses_opened_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_pauses
    ADD CONSTRAINT ticket_pauses_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES public.users(id);


--
-- Name: ticket_pauses ticket_pauses_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_pauses
    ADD CONSTRAINT ticket_pauses_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.reasons(id);


--
-- Name: ticket_pauses ticket_pauses_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_pauses
    ADD CONSTRAINT ticket_pauses_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: ticket_pauses ticket_pauses_root_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_pauses
    ADD CONSTRAINT ticket_pauses_root_reason_id_fkey FOREIGN KEY (root_reason_id) REFERENCES public.reasons(id);


--
-- Name: ticket_pauses ticket_pauses_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_pauses
    ADD CONSTRAINT ticket_pauses_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_ratings ticket_ratings_rated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_ratings
    ADD CONSTRAINT ticket_ratings_rated_by_fkey FOREIGN KEY (rated_by) REFERENCES public.users(id);


--
-- Name: ticket_ratings ticket_ratings_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_ratings
    ADD CONSTRAINT ticket_ratings_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.requesters(id);


--
-- Name: ticket_ratings ticket_ratings_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_ratings
    ADD CONSTRAINT ticket_ratings_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_validations ticket_validations_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_validations
    ADD CONSTRAINT ticket_validations_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_validations ticket_validations_validator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_validations
    ADD CONSTRAINT ticket_validations_validator_user_id_fkey FOREIGN KEY (validator_user_id) REFERENCES public.users(id);


--
-- Name: tickets tickets_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id);


--
-- Name: tickets tickets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: tickets tickets_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id);


--
-- Name: tickets tickets_dependency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_dependency_id_fkey FOREIGN KEY (dependency_id) REFERENCES public.dependencies(id);


--
-- Name: tickets tickets_duplicate_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_duplicate_of_id_fkey FOREIGN KEY (duplicate_of_id) REFERENCES public.tickets(id);


--
-- Name: tickets tickets_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: tickets tickets_priority_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_priority_id_fkey FOREIGN KEY (priority_id) REFERENCES public.priorities(id);


--
-- Name: tickets tickets_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(id);


--
-- Name: tickets tickets_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.users(id);


--
-- Name: tickets tickets_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.requesters(id);


--
-- Name: tickets tickets_service_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_service_type_id_fkey FOREIGN KEY (service_type_id) REFERENCES public.service_types(id);


--
-- Name: tickets tickets_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id);


--
-- Name: tickets tickets_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: time_spans time_spans_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_spans
    ADD CONSTRAINT time_spans_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: time_spans time_spans_subject_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_spans
    ADD CONSTRAINT time_spans_subject_technician_id_fkey FOREIGN KEY (subject_technician_id) REFERENCES public.technicians(id);


--
-- Name: time_spans time_spans_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_spans
    ADD CONSTRAINT time_spans_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: time_spans time_spans_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_spans
    ADD CONSTRAINT time_spans_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: work_calendar_holidays work_calendar_holidays_calendar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_calendar_holidays
    ADD CONSTRAINT work_calendar_holidays_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.work_calendars(id) ON DELETE CASCADE;


--
-- Name: work_calendar_intervals work_calendar_intervals_calendar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_calendar_intervals
    ADD CONSTRAINT work_calendar_intervals_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.work_calendars(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


