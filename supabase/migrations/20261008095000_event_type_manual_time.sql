-- Fase 4B: tipo de evento para los tramos de tiempo manuales.
-- En su propia migración para no usar el valor en la misma transacción en que se agrega.
alter type public.event_type add value if not exists 'manual_time_recorded';
