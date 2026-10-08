-- Fase 6D: convivencia con el sistema de origen (genérica y sin nombrar plataformas).
-- Tareas de actualización, estado reportado por el origen y autoridad del dato en un conflicto.

alter table public.external_systems
  add column authority text not null default 'source'
    check (authority in ('source', 'axia', 'manual'));
comment on column public.external_systems.authority is
  'Quién manda en un conflicto de datos: el origen, Axia o decisión manual.';

alter table public.ticket_external_refs
  add column external_status text;
comment on column public.ticket_external_refs.external_status is
  'Estado reportado por el sistema externo, para detectar diferencias sin acoplar el modelo.';

create table public.integration_tasks (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  system text not null references public.external_systems (name),
  description text not null,
  assigned_to uuid references auth.users (id),
  due_date date,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.integration_tasks is
  'Tareas para reflejar en el sistema externo un cambio de Axia, con responsable y fecha.';

create index idx_integration_tasks_ticket on public.integration_tasks (ticket_id, status);

create trigger integration_tasks_set_updated_at before update on public.integration_tasks
  for each row execute function public.set_updated_at();

alter table public.integration_tasks enable row level security;

create policy integration_tasks_read on public.integration_tasks
  for select to authenticated
  using (public.has_permission((select auth.uid()), 'data.import'));

create or replace function public.integration_task_create(
  p_ticket_id uuid,
  p_system text,
  p_description text,
  p_assigned_to uuid default null,
  p_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.require_permission('data.import');
  if not exists (select 1 from public.tickets where id = p_ticket_id) then
    raise exception 'El tiquet no existe' using errcode = 'P0001';
  end if;
  if p_description is null or btrim(p_description) = '' then
    raise exception 'La descripción es obligatoria' using errcode = 'P0001';
  end if;
  perform public.import_system(p_system);
  insert into public.integration_tasks (
    ticket_id, system, description, assigned_to, due_date, created_by)
  values (p_ticket_id, btrim(p_system), btrim(p_description), p_assigned_to, p_due_date, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
comment on function public.integration_task_create(uuid, text, text, uuid, date) is
  'Crea una tarea de convivencia para un tiquet.';
revoke execute on function public.integration_task_create(uuid, text, text, uuid, date) from public, anon;
grant execute on function public.integration_task_create(uuid, text, text, uuid, date) to authenticated;

create or replace function public.integration_task_resolve(
  p_task_id uuid,
  p_status text default 'done'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('data.import');
  if p_status not in ('done', 'cancelled') then
    raise exception 'Estado de tarea inválido' using errcode = '22023';
  end if;
  update public.integration_tasks set status = p_status where id = p_task_id;
  if not found then
    raise exception 'La tarea no existe' using errcode = 'P0001';
  end if;
end;
$$;
comment on function public.integration_task_resolve(uuid, text) is
  'Marca una tarea de convivencia como hecha o cancelada.';
revoke execute on function public.integration_task_resolve(uuid, text) from public, anon;
grant execute on function public.integration_task_resolve(uuid, text) to authenticated;

create or replace function public.external_status_set(
  p_system text,
  p_external_id text,
  p_external_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_permission('data.import');
  update public.ticket_external_refs
  set external_status = p_external_status
  where system = btrim(p_system) and external_id = btrim(p_external_id);
  if not found then
    raise exception 'No hay referencia externa para % / %', p_system, p_external_id
      using errcode = 'P0001';
  end if;
end;
$$;
comment on function public.external_status_set(text, text, text) is
  'Registra el estado reportado por el sistema externo de una referencia.';
revoke execute on function public.external_status_set(text, text, text) from public, anon;
grant execute on function public.external_status_set(text, text, text) to authenticated;
