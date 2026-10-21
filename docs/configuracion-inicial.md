# Configuración inicial

Guía de arranque del stack propio de Axia. La instalación detallada y los respaldos están en
[`docs/migracion/instalacion-autoalojada.md`](migracion/instalacion-autoalojada.md).

## 1. Requisitos

- Node.js LTS, pnpm 12 y Git.
- Docker Engine con Compose v2.
- `openssl` para generar secretos.

```bash
node -v
pnpm -v
docker version
docker compose version
```

## 2. Arranque local

```bash
corepack enable
pnpm install
./scripts/install.sh --demo
pnpm dev
```

El script:

1. genera `POSTGRES_OWNER_PASSWORD` y `AXIA_APP_PASSWORD` con 32 bytes aleatorios;
2. escribe `.env` con permisos `0600` y no lo sobrescribe;
3. construye y levanta `db`, `migrate` y `app`;
4. espera a `GET /api/health/ready`;
5. opcionalmente carga la semilla demo.

La API queda en `http://127.0.0.1:3000` y la web en `http://localhost:5173`; Vite reenvía `/api`.

## 3. Primer administrador

La instalación no crea administradores automáticamente. Abre `/login`: si la instancia está vacía,
la pantalla muestra el formulario de primer arranque. También puedes usar:

```bash
curl -sS -X POST http://127.0.0.1:3000/api/setup \
  -H 'content-type: application/json' \
  -d '{"username":"admin","fullName":"Administrador","password":"<tu-contraseña>"}'
```

## 4. Variables

| Variable | Uso |
|---|---|
| `POSTGRES_OWNER_PASSWORD` | Rol dueño de la base; solo migraciones |
| `AXIA_APP_PASSWORD` | Rol de aplicación, sin DDL |
| `MIGRATION_DATABASE_URL` | Conexión del runner de migraciones |
| `DATABASE_URL` | Conexión del servidor |
| `PORT` / `APP_PORT` | Puerto de la API |
| `DB_PORT` | Puerto local de PostgreSQL |
| `TRUST_PROXY` | Actívalo solo detrás de un proxy de confianza |
| `STORAGE_DIR` | Volumen de evidencias |
| `AXIA_DEMO_PASSWORD` | Opcional, solo semilla demo local |

Los secretos reales nunca se versionan. `.env` debe quedar con permisos `0600`.

## 5. Migraciones y base

```bash
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm db:next:demo -- --demo
```

Las migraciones viven en `apps/server/db/migrations/`. El runner usa un advisory lock y permite
`-- axia:no-transaction` para índices concurrentes. No se edita una migración ya aplicada: se agrega
otra.

## 6. Pruebas

```bash
pnpm check
```

La compuerta completa incluye lint, tipos, independencia, fronteras, knip, Vitest, Playwright,
integración contra PostgreSQL real y build. Necesita las variables de conexión indicadas en
`docs/migracion/instalacion-autoalojada.md`.

## 7. Despliegue

El servidor real lo prepara y ejecuta la persona. No se tocan producción ni la nube desde el agente.
El reverse proxy TLS, el dominio y los respaldos externos son responsabilidad de la instalación.
