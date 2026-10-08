-- Habilita la extensión pgTAP, que usan las pruebas de base de datos (`pnpm db:test`).
-- Se instala en el esquema `extensions` (el que Supabase reserva para extensiones).
create extension if not exists pgtap with schema extensions;
