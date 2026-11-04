-- Espera posterior a una reasignación: no es la primera respuesta del
-- supervisor, pero sí una fase que debe quedar cubierta.

alter type public.time_span_kind add value if not exists 'pending_take';
