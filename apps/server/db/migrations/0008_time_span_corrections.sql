-- Correcciones de tramos de tiempo.
-- Un tramo manual puede reemplazar un tramo anterior (automático o manual).
-- El original se conserva en el historial y se marca como anulado; los
-- indicadores excluyen los tramos anulados.

alter table public.time_spans
  add column replaces_span_id uuid;

alter table public.time_spans
  add constraint time_spans_replaces_span_id_fkey
  foreign key (replaces_span_id) references public.time_spans(id)
  on delete set null;

create index idx_time_spans_replaces
  on public.time_spans (replaces_span_id);

comment on column public.time_spans.replaces_span_id is
  'Tramo anterior reemplazado por esta corrección manual.';

comment on column public.time_spans.voided_at is
  'Marca de anulación de un tramo reemplazado o corregido; no cuenta en los indicadores.';
