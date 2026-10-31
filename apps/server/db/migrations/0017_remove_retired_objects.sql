-- Objetos del importador retirado y agregadores sustituidos por consultas con alcance.
-- El runner ejecuta este archivo completo en una transacción.
set local lock_timeout = '5s';

do $$
declare
  table_name text;
  has_rows boolean;
begin
  foreach table_name in array array[
    'catalog_import_rows', 'catalog_import_runs', 'catalog_import_specs',
    'catalog_aliases', 'import_records', 'import_batches', 'import_status_map',
    'integration_tasks'
  ] loop
    -- Mantener el bloqueo hasta el commit evita inserciones entre comprobar y retirar.
    execute format('lock table public.%I in access exclusive mode', table_name);
    execute format('select exists(select 1 from public.%I)', table_name) into has_rows;
    if has_rows then
      -- El runner conserva el mensaje principal; no depender de un HINT separado.
      raise exception 'No se pueden retirar tablas históricas con datos: public.%. Exportar y revisar los datos con el operador antes de reintentar. No se ha aplicado la retirada.', table_name;
    end if;
  end loop;
end;
$$;

-- RESTRICT hace fallar y revierte la migración si existe un consumidor SQL imprevisto.
drop table public.catalog_import_rows restrict;
drop table public.catalog_import_runs restrict;
drop table public.catalog_import_specs restrict;
drop table public.catalog_aliases restrict;
drop table public.import_records restrict;
drop table public.import_batches restrict;
drop table public.import_status_map restrict;
drop table public.integration_tasks restrict;

drop function public.metrics_by_technician(date, date, uuid, uuid, uuid, uuid) restrict;
drop function public.metrics_duplicate_alerts(date, date, uuid, uuid, uuid, uuid) restrict;
drop function public.metrics_duplicate_tickets(date, date, uuid, uuid, uuid, uuid) restrict;
drop function public.metrics_duplicates_by_dimension(date, date, uuid, uuid, uuid, uuid) restrict;
drop function public.metrics_pauses_by_reason(date, date, uuid, uuid, uuid, uuid) restrict;
drop function public.metrics_reject_cancel_by_reason(date, date, uuid, uuid, uuid, uuid) restrict;
drop function public.metrics_routing(date, date, uuid, uuid, uuid, uuid) restrict;
drop function public.metrics_satisfaction(date, date, uuid, uuid, uuid, uuid) restrict;
drop function public.metrics_sla(date, date, uuid, uuid, uuid, uuid) restrict;
drop function public.metrics_sla_by_priority(date, date, uuid, uuid, uuid, uuid) restrict;
drop function public.metrics_dims_in(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid) restrict;
