# Supabase autoalojado

## Objeto

Poner en marcha el stack de Supabase (Postgres, Auth, Storage, Realtime, Kong) con el compose
oficial. El compose **no** se versiona en el repositorio (cambia con frecuencia y contiene secretos);
se copia en el servidor de destino.

> **Nota:** `./deploy/scripts/up.sh` automatiza los pasos 1 y 2 (descarga el compose y lo levanta) y
> aplica las migraciones si existe `DATABASE_URL`. Los pasos siguientes detallan el procedimiento
> manual y los valores que deben editarse.

## Procedimiento

1. Copiar el compose oficial:

   ```bash
   git clone --depth 1 https://github.com/supabase/supabase
   mkdir -p deploy/supabase/docker
   cp -rf supabase/docker/* deploy/supabase/docker/
   cp supabase/docker/.env.example deploy/supabase/docker/.env
   cd deploy/supabase/docker
   ```

2. Editar `deploy/supabase/docker/.env` y reemplazar **todos** los secretos: contraseña de Postgres,
   `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, credenciales del panel, claves internas, SMTP,
   `SITE_URL`, `API_EXTERNAL_URL` y `SUPABASE_PUBLIC_URL`. La guía oficial de autoalojamiento explica
   cómo generar las claves JWT. **Ningún valor de ejemplo debe conservarse ni incorporarse al
   repositorio.**

3. Levantar el stack:

   ```bash
   docker compose pull
   docker compose up -d
   docker compose ps
   ```

## Notas

- El puerto 5432 sale por **Supavisor**; el usuario de base incluye el sufijo del tenant
  (`postgres.<POOLER_TENANT_ID>`). Ajustar `DATABASE_URL` en consecuencia.
- `deploy/supabase/.env.example` lista las variables clave como recordatorio (sin valores reales).
- El `.gitignore` de esta carpeta excluye `docker/` (compose copiado) y `volumes/`.
