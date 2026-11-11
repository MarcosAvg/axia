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

-- Clasificación de los subestados existentes. Los nombres son los de la
-- semilla de referencia; las instalaciones nuevas reciben el catálogo completo.
update public.reasons
set pause_step_kind = 'progress'
where use = 'pause'
  and parent_id is not null
  and pause_step_kind is null;

update public.reasons
set pause_step_kind = 'exit'
where use = 'pause'
  and parent_id is not null
  and name in (
    'Recibido',
    'Personal disponible',
    'Servicio del proveedor concluido',
    'Acceso disponible',
    'Autorización recibida',
    'Herramienta disponible',
    'Condiciones restablecidas',
    'Tiquet relacionado concluido',
    'Información recibida',
    'Fecha acordada alcanzada'
  );

-- Motivos nuevos que cubren situaciones frecuentes no incluidas en la semilla
-- original. Cada uno nace con su secuencia y su salida.
insert into public.reasons (use, name, pause_step_kind)
values
  ('pause', 'Diagnóstico especializado', null),
  ('pause', 'Permiso o trámite', null),
  ('pause', 'Condición insegura', null),
  ('pause', 'Documentación técnica', null),
  ('pause', 'Equipo de acceso', null),
  ('pause', 'Traslado de personal', null)
on conflict (use, parent_id, name) do nothing;

insert into public.reasons (use, parent_id, name, pause_step_kind)
select 'pause', root.id, node.name, node.kind::public.pause_step_kind
from (values
  ('Falta de material', 'En almacén central', 'progress'),
  ('Falta de material', 'En importación o aduana', 'progress'),
  ('Falta de personal', 'Personal en otra atención', 'progress'),
  ('Falta de personal', 'Turno no cubierto', 'progress'),
  ('Falta de personal', 'Cobertura solicitada', 'progress'),
  ('Falta de personal', 'Cobertura aprobada', 'progress'),
  ('Falta de personal', 'Capacitación programada', 'progress'),
  ('Falta de personal', 'Capacitación completada', 'progress'),
  ('Falta de personal', 'Especialista contactado', 'progress'),
  ('Falta de personal', 'Especialista en sitio', 'progress'),
  ('Proveedor o contratista externo', 'Cotización solicitada', 'progress'),
  ('Proveedor o contratista externo', 'Cotización recibida', 'progress'),
  ('Proveedor o contratista externo', 'Orden de servicio emitida', 'progress'),
  ('Proveedor o contratista externo', 'Servicio en ejecución', 'progress'),
  ('Acceso al área', 'Solicitud de acceso enviada', 'progress'),
  ('Acceso al área', 'Autorización de acceso pendiente', 'progress'),
  ('Acceso al área', 'Área en liberación', 'progress'),
  ('Autorización', 'Presupuesto aprobado', 'progress'),
  ('Herramienta o equipo especial', 'Herramienta solicitada', 'progress'),
  ('Herramienta o equipo especial', 'Calibración pendiente', 'progress'),
  ('Herramienta o equipo especial', 'Herramienta en sitio', 'progress'),
  ('Condiciones externas', 'Paro de planta', 'progress'),
  ('Condiciones externas', 'Restricción vial', 'progress'),
  ('Dependencia de otro tiquet', 'Tiquet relacionado en proceso', 'progress'),
  ('Dependencia de otro tiquet', 'Tiquet relacionado en validación', 'progress'),
  ('Esperando información del solicitante', 'Recordatorio enviado', 'progress'),
  ('Programado', 'Fecha propuesta', 'progress'),
  ('Programado', 'Fecha acordada', 'progress'),
  ('Diagnóstico especializado', 'Prueba solicitada', 'progress'),
  ('Diagnóstico especializado', 'Prueba programada', 'progress'),
  ('Diagnóstico especializado', 'Prueba realizada', 'progress'),
  ('Diagnóstico especializado', 'Resultados recibidos', 'progress'),
  ('Diagnóstico especializado', 'Diagnóstico concluido', 'exit'),
  ('Permiso o trámite', 'Solicitud presentada', 'progress'),
  ('Permiso o trámite', 'En revisión', 'progress'),
  ('Permiso o trámite', 'Observaciones atendidas', 'progress'),
  ('Permiso o trámite', 'Derechos pagados', 'progress'),
  ('Permiso o trámite', 'Permiso otorgado', 'exit'),
  ('Condición insegura', 'Área delimitada', 'progress'),
  ('Condición insegura', 'Riesgo evaluado', 'progress'),
  ('Condición insegura', 'Medidas aplicadas', 'progress'),
  ('Condición insegura', 'Área segura', 'exit'),
  ('Documentación técnica', 'Documento solicitado', 'progress'),
  ('Documentación técnica', 'Documento recibido', 'progress'),
  ('Documentación técnica', 'Documento validado', 'progress'),
  ('Documentación técnica', 'Documentación disponible', 'exit'),
  ('Equipo de acceso', 'Equipo solicitado', 'progress'),
  ('Equipo de acceso', 'Equipo en sitio', 'progress'),
  ('Equipo de acceso', 'Equipo inspeccionado', 'progress'),
  ('Equipo de acceso', 'Acceso listo', 'exit'),
  ('Traslado de personal', 'Traslado solicitado', 'progress'),
  ('Traslado de personal', 'Viático autorizado', 'progress'),
  ('Traslado de personal', 'Traslado programado', 'progress'),
  ('Traslado de personal', 'Personal en sitio', 'exit')
) as node (root_name, name, kind)
join public.reasons root
  on root.use = 'pause'
  and root.parent_id is null
  and root.name = node.root_name
on conflict (use, parent_id, name) do nothing;

alter table public.reasons
  drop constraint if exists reasons_pause_step_kind_check;

alter table public.reasons
  add constraint reasons_pause_step_kind_check check (
    (use <> 'pause' and pause_step_kind is null)
    or (use = 'pause' and parent_id is null and pause_step_kind is null)
    or (use = 'pause' and parent_id is not null and pause_step_kind is not null)
  );

-- Aristas del flujo. La raíz encabeza la secuencia; cada paso de avance tiene
-- al menos una arista y las salidas solo aparecen al final de su rama.
with edge (root_name, from_name, to_name) as (
  values
    ('Falta de material', 'Falta de material', 'Por solicitar'),
    ('Falta de material', 'Por solicitar', 'Con proveedor'),
    ('Falta de material', 'Por solicitar', 'Sin proveedor'),
    ('Falta de material', 'Con proveedor', 'Solicitado'),
    ('Falta de material', 'Sin proveedor', 'Solicitado'),
    ('Falta de material', 'Solicitado', 'En cotización'),
    ('Falta de material', 'En cotización', 'Cotización aprobada'),
    ('Falta de material', 'Cotización aprobada', 'Compra externa'),
    ('Falta de material', 'Cotización aprobada', 'Salida de almacén'),
    ('Falta de material', 'Compra externa', 'En importación o aduana'),
    ('Falta de material', 'Compra externa', 'En tránsito'),
    ('Falta de material', 'En importación o aduana', 'En tránsito'),
    ('Falta de material', 'Salida de almacén', 'En almacén central'),
    ('Falta de material', 'En almacén central', 'En tránsito'),
    ('Falta de material', 'En tránsito', 'Recibido'),

    ('Falta de personal', 'Falta de personal', 'Sin técnico disponible'),
    ('Falta de personal', 'Sin técnico disponible', 'Personal en otra atención'),
    ('Falta de personal', 'Sin técnico disponible', 'Turno no cubierto'),
    ('Falta de personal', 'Sin técnico disponible', 'Técnico no capacitado'),
    ('Falta de personal', 'Sin técnico disponible', 'Requiere especialista'),
    ('Falta de personal', 'Personal en otra atención', 'Personal disponible'),
    ('Falta de personal', 'Turno no cubierto', 'Cobertura solicitada'),
    ('Falta de personal', 'Cobertura solicitada', 'Cobertura aprobada'),
    ('Falta de personal', 'Cobertura aprobada', 'Personal disponible'),
    ('Falta de personal', 'Técnico no capacitado', 'Capacitación programada'),
    ('Falta de personal', 'Capacitación programada', 'Capacitación completada'),
    ('Falta de personal', 'Capacitación completada', 'Personal disponible'),
    ('Falta de personal', 'Requiere especialista', 'Especialista contactado'),
    ('Falta de personal', 'Especialista contactado', 'Especialista en sitio'),
    ('Falta de personal', 'Especialista en sitio', 'Personal disponible'),

    ('Proveedor o contratista externo', 'Proveedor o contratista externo', 'Por contactar'),
    ('Proveedor o contratista externo', 'Por contactar', 'Contactado'),
    ('Proveedor o contratista externo', 'Contactado', 'Cotización solicitada'),
    ('Proveedor o contratista externo', 'Contactado', 'Visita agendada'),
    ('Proveedor o contratista externo', 'Contactado', 'En garantía'),
    ('Proveedor o contratista externo', 'Cotización solicitada', 'Cotización recibida'),
    ('Proveedor o contratista externo', 'Cotización recibida', 'Orden de servicio emitida'),
    ('Proveedor o contratista externo', 'Orden de servicio emitida', 'Visita agendada'),
    ('Proveedor o contratista externo', 'Visita agendada', 'Servicio en ejecución'),
    ('Proveedor o contratista externo', 'Servicio en ejecución', 'Servicio del proveedor concluido'),
    ('Proveedor o contratista externo', 'En garantía', 'Servicio del proveedor concluido'),

    ('Acceso al área', 'Acceso al área', 'Sin acceso'),
    ('Acceso al área', 'Sin acceso', 'Solicitud de acceso enviada'),
    ('Acceso al área', 'Sin acceso', 'Área ocupada'),
    ('Acceso al área', 'Sin acceso', 'Esperando al solicitante'),
    ('Acceso al área', 'Sin acceso', 'Fuera de horario permitido'),
    ('Acceso al área', 'Solicitud de acceso enviada', 'Autorización de acceso pendiente'),
    ('Acceso al área', 'Autorización de acceso pendiente', 'Acceso disponible'),
    ('Acceso al área', 'Área ocupada', 'Área en liberación'),
    ('Acceso al área', 'Área en liberación', 'Acceso disponible'),
    ('Acceso al área', 'Esperando al solicitante', 'Acceso disponible'),
    ('Acceso al área', 'Fuera de horario permitido', 'Acceso disponible'),

    ('Autorización', 'Autorización', 'Esperando aprobación de presupuesto'),
    ('Autorización', 'Esperando aprobación de presupuesto', 'Presupuesto aprobado'),
    ('Autorización', 'Presupuesto aprobado', 'Esperando aprobación de dirección'),
    ('Autorización', 'Esperando aprobación de dirección', 'Autorización recibida'),

    ('Herramienta o equipo especial', 'Herramienta o equipo especial', 'Por conseguir'),
    ('Herramienta o equipo especial', 'Por conseguir', 'Herramienta solicitada'),
    ('Herramienta o equipo especial', 'Herramienta solicitada', 'En renta o préstamo'),
    ('Herramienta o equipo especial', 'Herramienta solicitada', 'Calibración pendiente'),
    ('Herramienta o equipo especial', 'En renta o préstamo', 'Herramienta en sitio'),
    ('Herramienta o equipo especial', 'Calibración pendiente', 'Herramienta en sitio'),
    ('Herramienta o equipo especial', 'Herramienta en sitio', 'Herramienta disponible'),

    ('Condiciones externas', 'Condiciones externas', 'Clima'),
    ('Condiciones externas', 'Condiciones externas', 'Falla de servicios'),
    ('Condiciones externas', 'Condiciones externas', 'Paro de planta'),
    ('Condiciones externas', 'Condiciones externas', 'Restricción vial'),
    ('Condiciones externas', 'Clima', 'Condiciones restablecidas'),
    ('Condiciones externas', 'Falla de servicios', 'Condiciones restablecidas'),
    ('Condiciones externas', 'Paro de planta', 'Condiciones restablecidas'),
    ('Condiciones externas', 'Restricción vial', 'Condiciones restablecidas'),

    ('Dependencia de otro tiquet', 'Dependencia de otro tiquet', 'Pendiente de otro tiquet'),
    ('Dependencia de otro tiquet', 'Pendiente de otro tiquet', 'Tiquet relacionado en proceso'),
    ('Dependencia de otro tiquet', 'Tiquet relacionado en proceso', 'Tiquet relacionado en validación'),
    ('Dependencia de otro tiquet', 'Tiquet relacionado en validación', 'Tiquet relacionado concluido'),

    ('Esperando información del solicitante', 'Esperando información del solicitante', 'Información solicitada'),
    ('Esperando información del solicitante', 'Información solicitada', 'Recordatorio enviado'),
    ('Esperando información del solicitante', 'Recordatorio enviado', 'Información recibida'),

    ('Programado', 'Programado', 'Fecha pendiente'),
    ('Programado', 'Fecha pendiente', 'Fecha propuesta'),
    ('Programado', 'Fecha propuesta', 'Fecha acordada'),
    ('Programado', 'Fecha acordada', 'Fecha acordada alcanzada'),

    ('Diagnóstico especializado', 'Diagnóstico especializado', 'Prueba solicitada'),
    ('Diagnóstico especializado', 'Prueba solicitada', 'Prueba programada'),
    ('Diagnóstico especializado', 'Prueba programada', 'Prueba realizada'),
    ('Diagnóstico especializado', 'Prueba realizada', 'Resultados recibidos'),
    ('Diagnóstico especializado', 'Resultados recibidos', 'Diagnóstico concluido'),

    ('Permiso o trámite', 'Permiso o trámite', 'Solicitud presentada'),
    ('Permiso o trámite', 'Solicitud presentada', 'En revisión'),
    ('Permiso o trámite', 'En revisión', 'Observaciones atendidas'),
    ('Permiso o trámite', 'Observaciones atendidas', 'Derechos pagados'),
    ('Permiso o trámite', 'Derechos pagados', 'Permiso otorgado'),

    ('Condición insegura', 'Condición insegura', 'Área delimitada'),
    ('Condición insegura', 'Área delimitada', 'Riesgo evaluado'),
    ('Condición insegura', 'Riesgo evaluado', 'Medidas aplicadas'),
    ('Condición insegura', 'Medidas aplicadas', 'Área segura'),

    ('Documentación técnica', 'Documentación técnica', 'Documento solicitado'),
    ('Documentación técnica', 'Documento solicitado', 'Documento recibido'),
    ('Documentación técnica', 'Documento recibido', 'Documento validado'),
    ('Documentación técnica', 'Documento validado', 'Documentación disponible'),

    ('Equipo de acceso', 'Equipo de acceso', 'Equipo solicitado'),
    ('Equipo de acceso', 'Equipo solicitado', 'Equipo en sitio'),
    ('Equipo de acceso', 'Equipo en sitio', 'Equipo inspeccionado'),
    ('Equipo de acceso', 'Equipo inspeccionado', 'Acceso listo'),

    ('Traslado de personal', 'Traslado de personal', 'Traslado solicitado'),
    ('Traslado de personal', 'Traslado solicitado', 'Viático autorizado'),
    ('Traslado de personal', 'Viático autorizado', 'Traslado programado'),
    ('Traslado de personal', 'Traslado programado', 'Personal en sitio')
),
resolved as (
  select
    root.id as root_id,
    coalesce(source.id, root.id) as from_id,
    target.id as to_id
  from edge e
  join public.reasons root
    on root.use = 'pause'
    and root.parent_id is null
    and root.name = e.root_name
  left join public.reasons source
    on source.use = 'pause'
    and source.parent_id is not null
    and source.name = e.from_name
  join public.reasons target
    on target.use = 'pause'
    and target.parent_id is not null
    and target.name = e.to_name
)
insert into public.pause_transitions (from_reason_id, to_reason_id)
select resolved.from_id, resolved.to_id
from resolved
on conflict (from_reason_id, to_reason_id) do nothing;
