# Supabase autoalojado — pasos

El stack de Supabase (Postgres, Auth, Storage, Realtime, Kong/API) se levanta con el compose oficial.
**No** lo copiamos al repositorio (cambia con frecuencia y contiene secretos): se copia en el servidor.

> **Atajo:** `./deploy/scripts/up.sh` hace por ti los pasos 1–2 (descarga el compose y lo levanta) y
> migra si defines `DATABASE_URL`. Los pasos de abajo son el detalle manual (y qué hay que editar).

```bash
git clone --depth 1 https://github.com/supabase/supabase
mkdir -p deploy/supabase/docker
cp -rf supabase/docker/* deploy/supabase/docker/
cp supabase/docker/.env.example deploy/supabase/docker/.env
cd deploy/supabase/docker
```

Edita `deploy/supabase/docker/.env` y **cambia todos los secretos**: contraseña de Postgres,
`JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, credenciales del dashboard, claves internas, SMTP,
`SITE_URL`, `API_EXTERNAL_URL` y `SUPABASE_PUBLIC_URL`. La guía oficial de autoalojamiento explica
cómo generar las claves JWT. **Nunca** dejes los de ejemplo ni subas ese archivo al repositorio.

```bash
docker compose pull
docker compose up -d
docker compose ps
```

- El puerto 5432 sale por **Supavisor**; el usuario de base lleva un sufijo del tenant
  (`postgres.<POOLER_TENANT_ID>`). Ajusta la `DATABASE_URL` en consecuencia.
- `deploy/supabase/.env.example` lista las variables clave como recordatorio (sin valores reales).
- `.gitignore` de esta carpeta evita subir `docker/` (compose copiado) y `volumes/`.
