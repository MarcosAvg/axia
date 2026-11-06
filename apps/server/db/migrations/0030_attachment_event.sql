-- Evento de bitácora al ligar un adjunto. No se usa en esta migración para
-- respetar la restricción de PostgreSQL sobre valores nuevos en la misma
-- transacción.
alter type public.event_type add value 'attachment_added';
