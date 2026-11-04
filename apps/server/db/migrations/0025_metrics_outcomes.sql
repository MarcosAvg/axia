-- La base de métricas conserva todos los desenlaces. El rendimiento se
-- segmenta por estado; SLA y resolución solo cuentan tiquets cerrados.

create or replace view public.v_ticket_metrics_base
with (security_invoker = 'true') as
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
    public.ticket_time_by_kind_extra(id, 'active_work'::public.time_span_kind) AS active_work_time_extra,
    CASE
      WHEN status = ANY (ARRAY['closed'::public.ticket_status, 'rejected'::public.ticket_status, 'cancelled'::public.ticket_status, 'duplicate'::public.ticket_status])
        THEN status::text
      ELSE 'open'::text
    END AS outcome
   FROM public.tickets t;

comment on view public.v_ticket_metrics_base is
  'Indicadores base por tiquet, incluidos los desenlaces. Los duplicados dejan de excluirse de la base y se segmentan por outcome.';

create or replace view public.v_ticket_sla
with (security_invoker = 'true') as
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
          WHERE (t.status = 'closed'::public.ticket_status)
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

comment on view public.v_ticket_sla is
  'Cumplimiento de tiempos objetivo por tiquet cerrado (sin desenlaces descartados).';
