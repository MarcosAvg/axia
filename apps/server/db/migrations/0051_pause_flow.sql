-- Flujo explícito de la pausa: el motivo se abre con una raíz, el técnico
-- avanza por pasos y solo puede reanudar con una salida habilitada desde el
-- paso actual. La jerarquía de `reasons` se conserva para organizar el
-- catálogo; las aristas de `pause_transitions` son la autoridad del flujo.

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'pause_step_kind'
  ) then
    create type public.pause_step_kind as enum ('progress', 'exit');
  end if;
end
$$;

alter table public.reasons
  add column if not exists pause_step_kind public.pause_step_kind;

comment on column public.reasons.pause_step_kind is
  'Tipo de subestado de pausa: avance (progress) o salida (exit). Las raíces y los motivos de otros usos lo dejan nulo.';

create table if not exists public.pause_transitions (
  from_reason_id uuid not null references public.reasons(id),
  to_reason_id uuid not null references public.reasons(id),
  created_at timestamp with time zone default now() not null,
  constraint pause_transitions_pkey primary key (from_reason_id, to_reason_id),
  constraint pause_transitions_no_self check (from_reason_id <> to_reason_id)
);

comment on table public.pause_transitions is
  'Aristas del flujo de pausa. Desde una raíz o un paso de avance se llega a otro paso o a una salida.';

create index if not exists pause_transitions_to_idx
  on public.pause_transitions (to_reason_id);

create or replace function public.pause_transitions_validate()
returns trigger
language plpgsql
as $$
declare
  from_use public.reason_use;
  from_parent uuid;
  from_kind public.pause_step_kind;
  to_use public.reason_use;
  to_parent uuid;
  to_kind public.pause_step_kind;
  from_root uuid;
  to_root uuid;
  creates_cycle boolean;
begin
  select use, parent_id, pause_step_kind
  into from_use, from_parent, from_kind
  from public.reasons
  where id = new.from_reason_id;

  select use, parent_id, pause_step_kind
  into to_use, to_parent, to_kind
  from public.reasons
  where id = new.to_reason_id;

  if from_use is null or to_use is null then
    raise exception 'El motivo de la arista no existe';
  end if;
  if from_use <> 'pause' or to_use <> 'pause' then
    raise exception 'Las aristas de pausa solo unen motivos de pausa';
  end if;
  if to_parent is null then
    raise exception 'La raíz del motivo no puede ser un destino del flujo';
  end if;
  if from_kind = 'exit' then
    raise exception 'Una salida no puede tener siguientes';
  end if;
  if from_parent is not null and from_kind <> 'progress' then
    raise exception 'El origen debe ser la raíz o un paso de avance';
  end if;
  if to_kind is null or to_kind not in ('progress', 'exit') then
    raise exception 'El destino debe ser un paso de avance o una salida';
  end if;

  with recursive ancestors as (
    select id, parent_id
    from public.reasons
    where id = new.from_reason_id
    union all
    select r.id, r.parent_id
    from public.reasons r
    join ancestors a on r.id = a.parent_id
  )
  select id into from_root from ancestors where parent_id is null;

  with recursive ancestors as (
    select id, parent_id
    from public.reasons
    where id = new.to_reason_id
    union all
    select r.id, r.parent_id
    from public.reasons r
    join ancestors a on r.id = a.parent_id
  )
  select id into to_root from ancestors where parent_id is null;

  if from_root is distinct from to_root then
    raise exception 'Los dos motivos de la arista deben pertenecer al mismo motivo raíz';
  end if;

  with recursive descendants as (
    select new.to_reason_id as id
    union
    select t.to_reason_id
    from public.pause_transitions t
    join descendants d on t.from_reason_id = d.id
  )
  select exists (
    select 1 from descendants where id = new.from_reason_id
  ) into creates_cycle;

  if creates_cycle then
    raise exception 'La arista crea un ciclo en el flujo de pausa';
  end if;

  return new;
end;
$$;

drop trigger if exists pause_transitions_validate on public.pause_transitions;

create trigger pause_transitions_validate
before insert or update on public.pause_transitions
for each row execute function public.pause_transitions_validate();

-- Todo subestado de pausa nace como avance salvo que se indique lo contrario;
-- las raíces y los motivos de otros usos conservan el tipo nulo. Así una
-- semilla antigua o una carga directa nunca deja un subestado sin clasificar.
create or replace function public.reasons_set_pause_step_kind()
returns trigger
language plpgsql
as $$
begin
  if new.use <> 'pause' or new.parent_id is null then
    new.pause_step_kind := null;
  elsif new.pause_step_kind is null then
    new.pause_step_kind := 'progress';
  end if;
  if new.pause_step_kind = 'exit' and new.id is not null and exists (
    select 1 from public.pause_transitions t
    where t.from_reason_id = new.id
  ) then
    raise exception 'Una salida no puede tener siguientes';
  end if;
  return new;
end;
$$;

drop trigger if exists reasons_set_pause_step_kind on public.reasons;

create trigger reasons_set_pause_step_kind
before insert or update on public.reasons
for each row execute function public.reasons_set_pause_step_kind();

alter table public.reasons
  alter column pause_step_kind set default 'progress'::public.pause_step_kind;

grant select, insert, update, delete on public.pause_transitions to axia_app;
grant execute on function public.pause_transitions_validate() to axia_app;
grant execute on function public.reasons_set_pause_step_kind() to axia_app;


-- Semilla operativa: máximo dos pasos de avance por motivo y salidas directas
-- donde la condición puede resolverse sin seguimiento. El administrador puede
-- agregar más pasos o salidas desde el editor de flujo.
create temporary table pause_seed_nodes (
  root_name text not null,
  name text not null,
  kind public.pause_step_kind not null
) on commit drop;

insert into pause_seed_nodes (root_name, name, kind) values
  ('Falta de material', 'Solicitado', 'progress'),
  ('Falta de material', 'En compra externa o cotización', 'progress'),
  ('Falta de material', 'Recibido', 'exit'),
  ('Falta de material', 'Sustituido', 'exit'),

  ('Falta de personal', 'Cobertura solicitada', 'progress'),
  ('Falta de personal', 'Personal disponible', 'exit'),
  ('Falta de personal', 'Apoyo externo disponible', 'exit'),

  ('Proveedor o contratista externo', 'Contactado', 'progress'),
  ('Proveedor o contratista externo', 'Visita agendada', 'progress'),
  ('Proveedor o contratista externo', 'Servicio concluido', 'exit'),

  ('Acceso al área', 'Acceso gestionado', 'progress'),
  ('Acceso al área', 'Acceso disponible', 'exit'),

  ('Autorización', 'Trámite en revisión', 'progress'),
  ('Autorización', 'Autorización recibida', 'exit'),
  ('Autorización', 'Autorización condicionada', 'exit'),

  ('Herramienta o equipo especial', 'Herramienta solicitada', 'progress'),
  ('Herramienta o equipo especial', 'Herramienta disponible', 'exit'),
  ('Herramienta o equipo especial', 'Herramienta sustituta disponible', 'exit'),

  ('Condiciones externas', 'Condiciones en observación', 'progress'),
  ('Condiciones externas', 'Condiciones restablecidas', 'exit'),

  ('Dependencia de otro tiquet', 'Tiquet relacionado en proceso', 'progress'),
  ('Dependencia de otro tiquet', 'Tiquet relacionado concluido', 'exit'),

  ('Esperando información del solicitante', 'Información solicitada', 'progress'),
  ('Esperando información del solicitante', 'Información recibida', 'exit'),
  ('Esperando información del solicitante', 'Información parcial recibida', 'exit'),

  ('Programado', 'Fecha acordada', 'progress'),
  ('Programado', 'Fecha acordada alcanzada', 'exit'),

  ('Diagnóstico especializado', 'Prueba solicitada', 'progress'),
  ('Diagnóstico especializado', 'Diagnóstico concluido', 'exit'),

  ('Permiso o trámite', 'Trámite presentado', 'progress'),
  ('Permiso o trámite', 'Permiso otorgado', 'exit'),
  ('Permiso o trámite', 'Permiso condicionado', 'exit'),

  ('Condición insegura', 'Medidas en ejecución', 'progress'),
  ('Condición insegura', 'Área segura', 'exit'),

  ('Documentación técnica', 'Documento solicitado', 'progress'),
  ('Documentación técnica', 'Documentación disponible', 'exit'),

  ('Equipo de acceso', 'Equipo solicitado', 'progress'),
  ('Equipo de acceso', 'Acceso listo', 'exit'),

  ('Traslado de personal', 'Traslado programado', 'progress'),
  ('Traslado de personal', 'Personal en sitio', 'exit');

insert into public.reasons (use, name, pause_step_kind)
values
  ('pause', 'Falta de material', null),
  ('pause', 'Falta de personal', null),
  ('pause', 'Proveedor o contratista externo', null),
  ('pause', 'Acceso al área', null),
  ('pause', 'Autorización', null),
  ('pause', 'Herramienta o equipo especial', null),
  ('pause', 'Condiciones externas', null),
  ('pause', 'Dependencia de otro tiquet', null),
  ('pause', 'Esperando información del solicitante', null),
  ('pause', 'Programado', null),
  ('pause', 'Diagnóstico especializado', null),
  ('pause', 'Permiso o trámite', null),
  ('pause', 'Condición insegura', null),
  ('pause', 'Documentación técnica', null),
  ('pause', 'Equipo de acceso', null),
  ('pause', 'Traslado de personal', null)
on conflict (use, parent_id, name) do nothing;

insert into public.reasons (use, parent_id, name, pause_step_kind)
select 'pause', root.id, node.name, node.kind
from pause_seed_nodes node
join public.reasons root
  on root.use = 'pause'
  and root.parent_id is null
  and root.name = node.root_name
on conflict (use, parent_id, name) do update
  set pause_step_kind = excluded.pause_step_kind;

delete from public.pause_transitions;

do $$
declare
  removed integer;
begin
  if not exists (select 1 from public.ticket_pauses limit 1) then
    -- Instalación sin historial: retira los nodos del catálogo anterior que no
    -- pertenecen a la semilla operativa. Se eliminan de hoja hacia la raíz.
    loop
      delete from public.reasons r
      where r.use = 'pause'
        and r.parent_id is not null
        and not exists (
          select 1 from pause_seed_nodes node where node.name = r.name
        )
        and not exists (
          select 1 from public.reasons child where child.parent_id = r.id
        );
      get diagnostics removed = row_count;
      exit when removed = 0;
    end loop;
  else
    -- Instalación con historial: conserva los tiquets y desactiva los nodos
    -- que no forman parte de la semilla operativa.
    update public.reasons r
    set active = false
    where r.use = 'pause'
      and r.parent_id is not null
      and not exists (
        select 1 from pause_seed_nodes node where node.name = r.name
      );
  end if;
end
$$;

alter table public.reasons
  drop constraint if exists reasons_pause_step_kind_check;

alter table public.reasons
  add constraint reasons_pause_step_kind_check check (
    (use <> 'pause' and pause_step_kind is null)
    or (use = 'pause' and parent_id is null and pause_step_kind is null)
    or (use = 'pause' and parent_id is not null and pause_step_kind is not null)
  );

-- Aristas del flujo. La raíz puede saltar directo a una salida o a su primer
-- paso de avance; los demás motivos conservan dos pasos como máximo.
with edge (root_name, from_name, to_name) as (
  values
    ('Falta de material', 'Falta de material', 'Solicitado'),
    ('Falta de material', 'Solicitado', 'En compra externa o cotización'),
    ('Falta de material', 'En compra externa o cotización', 'Recibido'),
    ('Falta de material', 'En compra externa o cotización', 'Sustituido'),

    ('Falta de personal', 'Falta de personal', 'Personal disponible'),
    ('Falta de personal', 'Falta de personal', 'Cobertura solicitada'),
    ('Falta de personal', 'Cobertura solicitada', 'Personal disponible'),
    ('Falta de personal', 'Cobertura solicitada', 'Apoyo externo disponible'),

    ('Proveedor o contratista externo', 'Proveedor o contratista externo', 'Servicio concluido'),
    ('Proveedor o contratista externo', 'Proveedor o contratista externo', 'Contactado'),
    ('Proveedor o contratista externo', 'Contactado', 'Visita agendada'),
    ('Proveedor o contratista externo', 'Contactado', 'Servicio concluido'),
    ('Proveedor o contratista externo', 'Visita agendada', 'Servicio concluido'),

    ('Acceso al área', 'Acceso al área', 'Acceso disponible'),
    ('Acceso al área', 'Acceso al área', 'Acceso gestionado'),
    ('Acceso al área', 'Acceso gestionado', 'Acceso disponible'),

    ('Autorización', 'Autorización', 'Autorización recibida'),
    ('Autorización', 'Autorización', 'Trámite en revisión'),
    ('Autorización', 'Trámite en revisión', 'Autorización recibida'),
    ('Autorización', 'Trámite en revisión', 'Autorización condicionada'),

    ('Herramienta o equipo especial', 'Herramienta o equipo especial', 'Herramienta disponible'),
    ('Herramienta o equipo especial', 'Herramienta o equipo especial', 'Herramienta solicitada'),
    ('Herramienta o equipo especial', 'Herramienta solicitada', 'Herramienta disponible'),
    ('Herramienta o equipo especial', 'Herramienta solicitada', 'Herramienta sustituta disponible'),

    ('Condiciones externas', 'Condiciones externas', 'Condiciones restablecidas'),
    ('Condiciones externas', 'Condiciones externas', 'Condiciones en observación'),
    ('Condiciones externas', 'Condiciones en observación', 'Condiciones restablecidas'),

    ('Dependencia de otro tiquet', 'Dependencia de otro tiquet', 'Tiquet relacionado concluido'),
    ('Dependencia de otro tiquet', 'Dependencia de otro tiquet', 'Tiquet relacionado en proceso'),
    ('Dependencia de otro tiquet', 'Tiquet relacionado en proceso', 'Tiquet relacionado concluido'),

    ('Esperando información del solicitante', 'Esperando información del solicitante', 'Información recibida'),
    ('Esperando información del solicitante', 'Esperando información del solicitante', 'Información solicitada'),
    ('Esperando información del solicitante', 'Información solicitada', 'Información recibida'),
    ('Esperando información del solicitante', 'Información solicitada', 'Información parcial recibida'),

    ('Programado', 'Programado', 'Fecha acordada alcanzada'),
    ('Programado', 'Programado', 'Fecha acordada'),
    ('Programado', 'Fecha acordada', 'Fecha acordada alcanzada'),

    ('Diagnóstico especializado', 'Diagnóstico especializado', 'Diagnóstico concluido'),
    ('Diagnóstico especializado', 'Diagnóstico especializado', 'Prueba solicitada'),
    ('Diagnóstico especializado', 'Prueba solicitada', 'Diagnóstico concluido'),

    ('Permiso o trámite', 'Permiso o trámite', 'Permiso otorgado'),
    ('Permiso o trámite', 'Permiso o trámite', 'Trámite presentado'),
    ('Permiso o trámite', 'Trámite presentado', 'Permiso otorgado'),
    ('Permiso o trámite', 'Trámite presentado', 'Permiso condicionado'),

    ('Condición insegura', 'Condición insegura', 'Área segura'),
    ('Condición insegura', 'Condición insegura', 'Medidas en ejecución'),
    ('Condición insegura', 'Medidas en ejecución', 'Área segura'),

    ('Documentación técnica', 'Documentación técnica', 'Documentación disponible'),
    ('Documentación técnica', 'Documentación técnica', 'Documento solicitado'),
    ('Documentación técnica', 'Documento solicitado', 'Documentación disponible'),

    ('Equipo de acceso', 'Equipo de acceso', 'Acceso listo'),
    ('Equipo de acceso', 'Equipo de acceso', 'Equipo solicitado'),
    ('Equipo de acceso', 'Equipo solicitado', 'Acceso listo'),

    ('Traslado de personal', 'Traslado de personal', 'Personal en sitio'),
    ('Traslado de personal', 'Traslado de personal', 'Traslado programado'),
    ('Traslado de personal', 'Traslado programado', 'Personal en sitio')
),
resolved as (
  select
    coalesce(source.id, root.id) as from_id,
    target.id as to_id
  from edge e
  join public.reasons root
    on root.use = 'pause'
    and root.parent_id is null
    and root.name = e.root_name
  left join public.reasons source
    on source.use = 'pause'
    and source.parent_id = root.id
    and source.name = e.from_name
  join public.reasons target
    on target.use = 'pause'
    and target.parent_id = root.id
    and target.name = e.to_name
)
insert into public.pause_transitions (from_reason_id, to_reason_id)
select resolved.from_id, resolved.to_id
from resolved
on conflict (from_reason_id, to_reason_id) do nothing;
