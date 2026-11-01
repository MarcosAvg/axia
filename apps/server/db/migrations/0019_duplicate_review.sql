-- Revisión de posibles duplicados: puntaje compuesto, motivos y decisión auditada.
alter table public.ticket_duplicate_candidates
  add column score numeric(4, 3),
  add column reasons text[] not null default '{}',
  add column decided_by uuid references public.users(id),
  add column decided_at timestamp with time zone;

update public.ticket_duplicate_candidates
set score = similarity
where score is null;

alter table public.ticket_duplicate_candidates
  alter column score set not null,
  add constraint ticket_duplicate_candidates_score_check
    check (score >= 0 and score <= 1);

create index idx_ticket_duplicate_candidates_pending
  on public.ticket_duplicate_candidates (ticket_id)
  where decision is null;

comment on column public.ticket_duplicate_candidates.score is
  'Puntaje compuesto de coincidencia (texto, ubicación, problema, subcategoría y dependencia).';
comment on column public.ticket_duplicate_candidates.reasons is
  'Señales que coincidieron, como claves para la interfaz.';
comment on column public.ticket_duplicate_candidates.decided_by is
  'Quién resolvió la alerta: registró de todas formas, enlazó o descartó.';
