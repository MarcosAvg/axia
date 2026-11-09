-- Retira las referencias externas genéricas. El núcleo no publica adaptadores ni usa estas tablas.
-- El runner ejecuta este archivo completo en una transacción.
set local lock_timeout = '5s';

do $$
declare
  table_name text;
  has_rows boolean;
begin
  foreach table_name in array array['ticket_external_refs', 'external_systems'] loop
    -- Mantener el bloqueo hasta el commit evita inserciones entre comprobar y retirar.
    execute format('lock table public.%I in access exclusive mode', table_name);
    execute format('select exists(select 1 from public.%I)', table_name) into has_rows;
    if has_rows then
      -- El runner conserva el mensaje principal; no depender de un HINT separado.
      raise exception 'No se pueden retirar las referencias externas con datos: public.%. Exportar y revisar los datos antes de reintentar. No se ha aplicado la retirada.', table_name;
    end if;
  end loop;
end;
$$;

-- RESTRICT hace fallar y revierte la migración si existe un consumidor SQL imprevisto.
drop table public.ticket_external_refs restrict;
drop table public.external_systems restrict;
