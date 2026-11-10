-- Los filtros por día y el volumen usan la zona de la instancia. La versión de
-- tres argumentos queda como envoltorio en UTC para compatibilidad.

create or replace function public.metrics_date_in(
  p_at timestamp with time zone,
  p_from date,
  p_to date,
  p_tz text
) returns boolean
language sql stable
as $$
  select (p_from is null
      or (p_at at time zone coalesce(nullif(p_tz, ''), 'UTC'))::date >= p_from)
     and (p_to is null
      or (p_at at time zone coalesce(nullif(p_tz, ''), 'UTC'))::date <= p_to);
$$;

create or replace function public.metrics_date_in(
  p_at timestamp with time zone,
  p_from date,
  p_to date
) returns boolean
language sql stable
as $$
  select public.metrics_date_in(p_at, p_from, p_to, 'UTC');
$$;
