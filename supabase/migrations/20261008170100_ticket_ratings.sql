-- Pendientes Fase 5: calificación de satisfacción (siempre opcional).
-- Una calificación por tiquet; el solicitante la hace, o alguien con rate_on_behalf a su nombre.

create table public.ticket_ratings (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  comment text,
  rated_by uuid references auth.users (id),
  requester_id uuid references public.requesters (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.ticket_ratings is
  'Calificación de satisfacción por tiquet (1-5, opcional; RN de calificación).';

alter table public.ticket_ratings enable row level security;

create policy ticket_ratings_read on public.ticket_ratings
  for select to authenticated using (public.can_see_ticket(ticket_id));

-- Calificar (o recalificar) un tiquet cerrado.
create or replace function public.ticket_rate(
  p_ticket_id uuid,
  p_score integer,
  p_comment text default null,
  p_client_request_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.tickets;
  v_requester_user uuid;
begin
  if public.request_already_handled(p_client_request_id) then return; end if;

  select * into v from public.tickets where id = p_ticket_id;
  if v.id is null then
    raise exception 'El tiquet no existe' using errcode = 'P0001';
  end if;
  if v.status <> 'closed' then
    raise exception 'Solo se califica un tiquet cerrado' using errcode = 'P0001';
  end if;
  if p_score is null or p_score < 1 or p_score > 5 then
    raise exception 'La calificación debe ser de 1 a 5' using errcode = '22023';
  end if;

  select user_id into v_requester_user
  from public.requesters where id = v.requester_id;

  if v_requester_user is distinct from auth.uid() then
    perform public.require_permission('ticket.rate_on_behalf');
  else
    perform public.require_permission('ticket.rate');
  end if;

  insert into public.ticket_ratings (
    ticket_id, score, comment, rated_by, requester_id)
  values (p_ticket_id, p_score, p_comment, auth.uid(), v.requester_id)
  on conflict (ticket_id) do update
    set score = excluded.score,
        comment = excluded.comment,
        rated_by = excluded.rated_by,
        updated_at = now();

  perform public.write_event(
    p_ticket_id, 'rated', jsonb_build_object('score', p_score),
    null, null, null, p_client_request_id);
end;
$$;
comment on function public.ticket_rate(uuid, integer, text, uuid) is
  'Registra o actualiza la calificación de un tiquet cerrado (propia o a nombre del solicitante).';
revoke execute on function public.ticket_rate(uuid, integer, text, uuid) from public, anon;
grant execute on function public.ticket_rate(uuid, integer, text, uuid) to authenticated;

-- Satisfacción agregada (una fila).
create or replace view public.v_metrics_satisfaction
with (security_invoker = true)
as
select
  round(avg(r.score)::numeric, 3) as average_score,
  count(*) as ratings,
  count(*) filter (where r.score = 1) as score_1,
  count(*) filter (where r.score = 2) as score_2,
  count(*) filter (where r.score = 3) as score_3,
  count(*) filter (where r.score = 4) as score_4,
  count(*) filter (where r.score = 5) as score_5
from public.ticket_ratings r;
comment on view public.v_metrics_satisfaction is
  'Satisfacción promedio y distribución de las calificaciones.';
grant select on public.v_metrics_satisfaction to authenticated;
