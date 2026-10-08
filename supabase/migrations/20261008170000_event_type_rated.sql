-- Pendientes Fase 5: tipo de evento de calificación de satisfacción.
-- En su propia migración para no usar el valor en la misma transacción en que se agrega.
alter type public.event_type add value if not exists 'rated';
