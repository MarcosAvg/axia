-- Adjuntos obligatorios por problema. Separados de `evidence`: no cuentan como
-- evidencia ni satisfacen las precondiciones de before/after/claim.
create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id),
  client_request_id uuid not null unique,
  uploaded_by uuid not null references public.users(id),
  original_name text not null,
  declared_mime_type text,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  storage_path text,
  processing_state text not null default 'pending',
  processing_error text,
  created_at timestamptz not null default now(),
  linked_at timestamptz,
  constraint ticket_attachments_state_check
    check (processing_state in ('pending', 'ready', 'failed')),
  constraint ticket_attachments_size_check
    check (size_bytes is null or size_bytes >= 0),
  constraint ticket_attachments_link_check
    check ((ticket_id is null) = (linked_at is null))
);

create index ticket_attachments_ticket_idx
  on public.ticket_attachments (ticket_id, created_at);

create index ticket_attachments_pending_idx
  on public.ticket_attachments (created_at)
  where ticket_id is null;

comment on table public.ticket_attachments is
  'Documentos obligatorios de ciertos problemas. Nunca se borran si están ligados.';
comment on column public.ticket_attachments.ticket_id is
  'Nulo mientras la subida está en preparación; se llena al ligarla al tiquet.';
comment on column public.ticket_attachments.mime_type is
  'Tipo verificado por el servidor a partir del contenido, no el declarado por el cliente.';

alter table public.problems
  add column attachment_required_types text[] not null default '{}',
  add column attachment_instructions text;

alter table public.problems
  add constraint problems_attachment_types_check
  check (
    attachment_required_types <@ array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]::text[]
  );

comment on column public.problems.attachment_required_types is
  'Tipos MIME que el alta debe adjuntar. Vacío significa que no exige adjunto.';
comment on column public.problems.attachment_instructions is
  'Texto de ayuda que se muestra a quien registra el tiquet.';

grant select, insert, update on public.ticket_attachments to axia_app;
