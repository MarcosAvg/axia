-- Semilla de datos ficticios de Axia. Se carga con `pnpm db:reset` y `supabase start`.
-- En este tramo solo la configuración de la instancia; los catálogos se completan en el tramo 8.

insert into public.instance_settings (singleton) values (true)
on conflict (singleton) do nothing;
