# Axia — Configuración inicial

Guía paso a paso para arrancar el proyecto **Axia** (seguimiento de tiquets de mantenimiento).

> **Antes de empezar:** los nombres de paquetes son estables, pero algunas opciones y comandos cambian entre versiones. Si un comando falla, contrasta con la documentación oficial de la herramienta (Vite, shadcn/ui, TanStack Router, Supabase CLI, vite-plugin-pwa).

---

## 0. Decisiones tomadas

| Capa | Elección |
|---|---|
| Nombre del proyecto | **Axia** |
| Frontend | **Vite + React + TypeScript** (SPA / PWA, sin meta-framework) |
| Enrutado y datos | TanStack Router + TanStack Query + TanStack Table |
| UI | Tailwind CSS + shadcn/ui |
| **Gráficas** | **Recharts**, mediante el componente `chart` de shadcn/ui (sustituye a ECharts) |
| Formularios | React Hook Form + Zod |
| Offline | Dexie (IndexedDB) + cola de salida (*outbox*) |
| PWA | vite-plugin-pwa |
| Backend | Supabase (nube o autoalojado): Postgres, Auth, Storage, Realtime, Edge Functions |
| Pruebas | Vitest, Playwright, pgTAP |
| Gestor de paquetes | pnpm (monorepo con workspaces) |
| Proxy en producción | El que elijas (no lo impone Axia) |
| Móvil nativo (opcional, después) | Capacitor |

El diseño de la base de datos (tablas, RLS, funciones de transición) se aborda en una etapa posterior. Esta guía deja listo todo lo demás.

---

## 1. Requisitos previos

Instala en tu equipo:

- **Node.js LTS**
- **pnpm** (se puede activar con `corepack enable`)
- **Git**
- **Docker** (Supabase local lo necesita)
- Editor con soporte de ESLint, Prettier y TypeScript (por ejemplo VS Code)

Verifica:

```bash
node -v
pnpm -v
git --version
docker --version
```

---

## 2. Estructura del repositorio

```
axia/
├── apps/
│   └── web/                 → PWA (Vite + React)
├── packages/
│   └── shared/              → tipos generados y esquemas compartidos
├── supabase/                → migraciones, funciones, semillas y pruebas pgTAP
│   ├── migrations/
│   ├── functions/
│   ├── tests/database/
│   └── seed.sql
├── deploy/                  → scripts y guías de despliegue (sin proxy impuesto)
├── docs/                    → arquitectura y decisiones
├── .github/workflows/       → CI
├── package.json
├── pnpm-workspace.yaml
└── .gitignore
```

---

## 3. Crear el monorepo

```bash
mkdir axia && cd axia
git init
pnpm init
mkdir -p apps packages/shared/src deploy docs
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
```

`package.json` de la raíz (ajusta la versión de pnpm a la que tengas instalada):

```json
{
  "name": "axia",
  "private": true,
  "packageManager": "pnpm@<tu-version>",
  "scripts": {
    "dev": "pnpm --filter @axia/web dev",
    "build": "pnpm --filter @axia/web build",
    "test": "pnpm -r test",
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:test": "supabase test db",
    "db:types": "supabase gen types typescript --local > packages/shared/src/database.types.ts"
  }
}
```

`.gitignore`:

```
node_modules
dist
.env
.env.*
!.env.example
deploy/supabase/.env
deploy/supabase/volumes
supabase/.branches
supabase/.temp
*.log
playwright-report
test-results
```

Paquete compartido, `packages/shared/package.json`:

```json
{
  "name": "@axia/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

`packages/shared/src/index.ts`:

```ts
export * from './database.types'
```

(El archivo `database.types.ts` se genera en el paso 6.)

---

## 4. Aplicación web (Vite + React + TypeScript)

### 4.1 Crear la app

```bash
pnpm create vite apps/web --template react-ts
cd apps/web
```

Cambia el nombre en `apps/web/package.json` a `"name": "@axia/web"` y luego:

```bash
pnpm install
```

### 4.2 Dependencias

```bash
# Enrutado, datos y tablas
pnpm add @tanstack/react-router @tanstack/react-query @tanstack/react-table
pnpm add -D @tanstack/router-plugin

# Formularios y validación
pnpm add react-hook-form zod @hookform/resolvers

# Supabase, offline, Excel, fotos
pnpm add @supabase/supabase-js dexie dexie-react-hooks exceljs \
  browser-image-compression tus-js-client

# Estilos
pnpm add tailwindcss @tailwindcss/vite

# Utilidades de desarrollo
pnpm add -D @types/node vite-plugin-pwa

# Paquete compartido del monorepo
pnpm add @axia/shared --workspace
```

Recharts se instala en el paso 4.5 junto con el componente de gráficas de shadcn/ui.

### 4.3 `vite.config.ts`

```ts
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // El plugin de rutas debe ir ANTES del de React
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt', // tú decides cuándo actualizar; evita recargar a medio trabajo
      manifest: {
        name: 'Axia',
        short_name: 'Axia',
        lang: 'es-MX',
        display: 'standalone',
        start_url: '/',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

Coloca los iconos `pwa-192.png`, `pwa-512.png` y `pwa-512-maskable.png` en `apps/web/public/`.

### 4.4 Alias `@` en TypeScript

Agrega en `tsconfig.json` y en `tsconfig.app.json` (dentro de `compilerOptions`), según indique la guía de shadcn/ui para Vite:

```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

### 4.5 Tailwind y shadcn/ui (incluye Recharts)

En `src/index.css`, reemplaza el contenido por:

```css
@import "tailwindcss";
```

Inicializa shadcn/ui y agrega los componentes base:

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input select dialog table tabs badge card chart
```

El componente `chart` instala **Recharts** y crea `src/components/ui/chart.tsx`.

### 4.6 Rutas por carpetas (TanStack Router)

```
src/routes/
├── __root.tsx               → marco común
├── index.tsx                → /
├── login.tsx                → /login
├── _auth.tsx                → layout que exige sesión
├── _auth/tickets/index.tsx  → /tickets
├── _auth/tickets/$id.tsx    → /tickets/:id
└── _auth/admin/catalogos.tsx
```

`src/routes/__root.tsx`:

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => <Outlet />,
})
```

`src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => <h1 className="p-6 text-2xl font-semibold">Axia</h1>,
})
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen' // lo genera el plugin al ejecutar dev
import './index.css'

const queryClient = new QueryClient()
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
```

> Las protecciones por rol en el enrutado (`beforeLoad`) son solo experiencia de usuario. La seguridad real está en las políticas RLS de Postgres.

### 4.7 Variables de entorno

`apps/web/.env.local` (no se sube al repositorio):

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<clave pública que muestra "supabase start">
```

Crea también `apps/web/.env.example` con los mismos nombres y sin valores reales.

### 4.8 Cliente de Supabase

`src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@axia/shared'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
```

> La clave pública va en el frontend por diseño. La **service role key** nunca sale del servidor ni de las Edge Functions.

### 4.9 Probar

```bash
pnpm dev
```

Debe abrir en `http://localhost:5173` mostrando "Axia".

---

## 5. Gráficas con Recharts (componente de shadcn/ui)

Ejemplo: `src/components/charts/tiquets-por-edificio.tsx`

```tsx
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const config = {
  total: { label: 'Tiquets', color: 'var(--chart-1)' },
} satisfies ChartConfig

export function TiquetsPorEdificio({
  data,
}: {
  data: { edificio: string; total: number }[]
}) {
  return (
    <ChartContainer config={config} className="min-h-[200px] w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="edificio" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
```

Envuélvelo en un `Card` de shadcn/ui para mantener el estilo del resto de la interfaz.

> El formato exacto del color (`var(--chart-1)` o `hsl(var(--chart-1))`) depende de la versión de Tailwind y shadcn/ui que tengas instalada. Usa el que genere el CLI.

Gráficas previstas: tiquets por edificio/categoría/tipo de servicio (barras), tendencia mensual (líneas), tiempo promedio por tramo (barras apiladas), motivos de pausa (barras o pastel) y antigüedad de pendientes (barras).

---

## 6. Supabase local y migraciones

Desde la **raíz** del repositorio:

```bash
pnpm add -D -w supabase
```

> Si pnpm bloquea el script de instalación del paquete `supabase`, ejecuta `pnpm approve-builds` y autorízalo.

```bash
pnpm supabase init                   # crea la carpeta /supabase
pnpm supabase start                  # levanta Postgres, Auth, Storage, Studio...
pnpm supabase status                 # muestra URL y claves locales
```

Puertos locales por defecto: API `54321`, base de datos `54322`, Studio `54323`.

Copia la URL y la clave pública a `apps/web/.env.local`.

Flujo de trabajo con la base de datos:

```bash
pnpm supabase migration new esquema_inicial   # crea un archivo en supabase/migrations
pnpm db:reset                                  # reconstruye la base con migraciones + seed
pnpm db:types                                  # regenera los tipos de TypeScript
```

Reglas de oro:

1. **Todo cambio de la base es una migración** (archivo SQL versionado). Nada de cambios manuales en Studio que no queden en un archivo.
2. Las mismas migraciones se aplican a local, pruebas, nube y autoalojado.
3. Después de cada migración, corre `pnpm db:types` y sube los tipos generados.

### Edge Functions (integraciones opcionales, notificaciones push)

```bash
pnpm supabase functions new integration-import
pnpm supabase functions serve
```

---

## 7. PWA y modo sin conexión

### 7.1 Requisitos de la PWA

- Servirse por **HTTPS** (en `localhost` funciona sin él).
- Manifest e iconos configurados (paso 4.3).
- `registerType: 'prompt'` para controlar cuándo se aplica una actualización.

Para probar en un celular durante el desarrollo, usa un túnel HTTPS o un certificado local.

### 7.2 Base local con Dexie

`src/lib/offline/db.ts` (campos en inglés, como exige `docs/convenciones-codigo.md`):

```ts
import Dexie, { type EntityTable } from 'dexie'

export interface OutboxItem {
  id: string // UUID generado en el cliente = clave de idempotencia
  type: string
  payload: unknown
  state: 'pending' | 'sending' | 'error'
  attempts: number
  createdAt: number
}

export interface Evidence {
  id: string
  ticketId: string
  blob: Blob // foto ya comprimida
  state: 'pending' | 'uploading' | 'uploaded' | 'error'
  createdAt: number
}

export const db = new Dexie('axia') as Dexie & {
  outbox: EntityTable<OutboxItem, 'id'>
  evidences: EntityTable<Evidence, 'id'>
}

db.version(1).stores({
  outbox: 'id, type, state, createdAt',
  evidences: 'id, ticketId, state',
})
```

### 7.3 Disparadores de sincronización

`src/lib/offline/sync.ts` (devuelve una función para detenerlos; útil en pruebas y al cerrar
sesión):

`src/lib/offline/sync.ts`:

```ts
export function startSync(process: () => Promise<void>): () => void {
  const onOnline = () => {
    void process()
  }
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void process()
    }
  }

  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisibilityChange)
  void process() // al abrir la app

  return () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
```

### 7.4 Reglas de la cola

- Cada acción se guarda primero en `outbox` con `crypto.randomUUID()`. La función en Postgres usa ese UUID para ignorar duplicados.
- No dependas de Background Sync del service worker (no existe en iOS Safari): sincroniza al abrir la app, al volver la conexión y al volver a primer plano.
- Comprime las fotos (`browser-image-compression`) antes de guardarlas y súbelas con TUS (reanudable) mediante `tus-js-client`.
- Marca los eventos con "evidencia pendiente" hasta que la foto termine de subir.

---

## 8. Pruebas

### 8.1 Base de datos (pgTAP) — la más importante

`supabase/tests/database/00_humo.test.sql`:

```sql
begin;
select plan(1);
select has_schema('public', 'existe el esquema public');
select * from finish();
rollback;
```

```bash
pnpm db:test
```

Aquí se probarán después las políticas RLS y las funciones de transición.

### 8.2 Frontend (Vitest)

```bash
cd apps/web
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Importa `defineConfig` desde `vitest/config` (o añade la referencia de tipos de Vitest) y agrega en la configuración:

```ts
test: { environment: 'jsdom', globals: true }
```

Script en `apps/web/package.json`: `"test": "vitest run"`.

### 8.3 Extremo a extremo (Playwright)

```bash
cd apps/web
pnpm exec playwright install chromium   # una vez por equipo; en el CI lleva --with-deps
```

La configuración vive en `apps/web/playwright.config.ts` (Chromium, `webServer` con
`pnpm dev`) y las pruebas en `apps/web/e2e/`. `pnpm test` corre Vitest y luego Playwright;
Vitest excluye `e2e/**` en `vite.config.ts`.

Incluye desde temprano un caso con la red cortada (`context.setOffline(true)`) para el flujo del técnico.

---

## 9. Integración continua

`.github/workflows/ci.yml` (versión vigente; usa la CLI fijada en el repositorio):

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # Levanta Supabase local con la CLI fijada en el repositorio; `pnpm check`
      # incluye la prueba pgTAP (`db:test`).
      - run: pnpm db:start
      - run: pnpm check
```

---

## 10. Producción autoalojada

### 10.1 Servidor

- Linux con Docker, un dominio (por ejemplo `axia.tuinstitucion.mx` y `api.axia.tuinstitucion.mx`) y puertos 80/443 abiertos.
- **Advertencia:** Docker publica puertos saltándose algunos firewalls (como `ufw`). Enlaza los puertos internos a `127.0.0.1` o usa reglas en la cadena `DOCKER-USER`, y no expongas Postgres a internet.

### 10.2 Stack de Supabase

```bash
git clone --depth 1 https://github.com/supabase/supabase
mkdir -p deploy/supabase/docker
cp -rf supabase/docker/* deploy/supabase/docker/
cp supabase/docker/.env.example deploy/supabase/docker/.env
cd deploy/supabase/docker
```

Edita `deploy/supabase/docker/.env` y **cambia todos los secretos**: contraseña de Postgres, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, credenciales del dashboard, claves internas, SMTP, `SITE_URL`, `API_EXTERNAL_URL` y `SUPABASE_PUBLIC_URL`. La guía oficial de autoalojamiento con Docker explica cómo generar las claves JWT. **Nunca dejes los valores de ejemplo y nunca subas este archivo al repositorio.**

```bash
docker compose pull
docker compose up -d
docker compose ps
```

### 10.3 Reverse proxy (el que elijas)

Axia **no impone** un proxy. Cualquiera sirve; solo debe cumplir el **contrato**:

1. Servir los estáticos de `apps/web/dist` con *fallback* a `index.html` (SPA).
2. Hacer proxy a **Kong** (API de Supabase, por defecto `127.0.0.1:8000`) **permitiendo WebSocket** (Realtime).
3. Poner `no-cache` a `sw.js`, `registerSW.js` y `manifest.webmanifest` (que los móviles no queden con versiones viejas de la PWA).
4. Permitir el tamaño de las **evidencias** (subida de fotos).
5. Terminar **TLS** donde tú decidas.

El detalle está en `deploy/README.md` y hay **ejemplos opcionales** en `deploy/examples/` (nginx y Traefik).

### 10.4 Aplicar migraciones

Desde el servidor, o por túnel SSH:

```bash
pnpm supabase db push --db-url "postgresql://<usuario>:<clave>@localhost:5432/postgres"
```

> En las versiones actuales del compose oficial, el puerto 5432 pasa por Supavisor y el usuario lleva un sufijo del tenant (`postgres.<POOLER_TENANT_ID>`). Verifica la cadena correcta en la guía oficial.

### 10.5 Publicar el frontend

En `apps/web/.env.production` (o variables de build) apunta a tu dominio:

```
VITE_SUPABASE_URL=https://api.axia.tuinstitucion.mx
VITE_SUPABASE_ANON_KEY=<ANON_KEY de producción>
```

```bash
pnpm build
# copia apps/web/dist al servidor, a /srv/axia/web
```

---

## 11. Alternativa: Supabase Cloud

```bash
pnpm supabase login
pnpm supabase link --project-ref <ref-del-proyecto>
pnpm supabase db push
pnpm supabase functions deploy
```

El mismo repositorio sirve para ambos entornos. Mantén cada uno con su propio archivo de variables (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).

---

## 12. Operación

- **Respaldos de la base:** tarea programada con `pg_dump`. Ejemplo (contenedor `supabase-db` del compose oficial):

  ```
  0 2 * * * docker exec supabase-db pg_dump -U postgres -Fc postgres > /backups/axia-$(date +\%F).dump
  ```

- **Respaldo de archivos (evidencias):** copia del volumen de Storage con restic o rsync.
- **Restauración de prueba** periódica: una copia que nunca se ha restaurado no es una garantía.
- **Errores:** GlitchTip (compatible con el SDK de Sentry) si quieres centralizarlos.
- **Reportes libres:** Metabase conectado a Postgres con un usuario de solo lectura.
- **Notificaciones push:** claves VAPID guardadas como secretos de las Edge Functions.
- **App nativa (solo si hace falta):** Capacitor sobre el mismo build.

---

## 13. Lista de verificación de arranque

**Entorno**
- [ ] Node, pnpm, Git y Docker instalados
- [ ] Repositorio `axia` creado con `pnpm-workspace.yaml` y `.gitignore`

**Frontend**
- [ ] App Vite + React + TypeScript creada (`@axia/web`)
- [ ] Tailwind y shadcn/ui inicializados, con el componente `chart` (Recharts)
- [ ] TanStack Router con rutas por carpetas funcionando
- [ ] TanStack Query y cliente de Supabase configurados
- [ ] PWA configurada (manifest, iconos, `registerType: 'prompt'`)
- [ ] Dexie con `outbox` y `evidencias`

**Backend**
- [ ] Supabase local levantado (`supabase start`)
- [ ] Primera migración creada y tipos generados
- [ ] Prueba pgTAP de humo pasando

**Calidad**
- [x] Vitest y Playwright instalados
- [ ] CI corriendo en cada cambio

**Producción (cuando toque)**
- [ ] Servidor con Docker, dominio y puertos 80/443
- [ ] Todos los secretos de Supabase cambiados
- [ ] Reverse proxy propio sirviendo el frontend y el API con TLS
- [ ] Respaldos programados y una restauración de prueba realizada

---

## 14. Siguientes pasos

1. Diseño de la base de datos: catálogos, tiquets, asignaciones, bloqueos con subestados, eventos y evidencias, con RLS por rol.
2. Funciones de transición (asignar, iniciar, pausar, resolver) con pruebas pgTAP.
3. Importadores y adaptadores de integración (opcionales y aislados del núcleo): ver `docs/integraciones-y-migracion.md`.
4. Pantallas: lista y detalle de tiquets, vista del técnico, bandeja del supervisor, catálogos, reportes.

---

## 15. Scripts de verificación que el agente debe crear en la Fase 0

Además de los scripts de la sección 3, la raíz del repositorio debe tener:

| Script | Qué hace |
|---|---|
| `pnpm lint` | ESLint con los límites de `docs/convenciones-codigo.md` |
| `pnpm typecheck` | Verificación de tipos de todo el monorepo |
| `pnpm knip` | Código y dependencias sin uso |
| `pnpm check:agnostic` | Falla si aparecen nombres de plataformas de terceros fuera de los adaptadores de integración |
| `pnpm check` | Compuerta completa: lint + typecheck + check:agnostic + check:boundaries + knip + test + db:test + build |

`check:agnostic` es un script (por ejemplo `scripts/check-agnostic.mjs`) que busca una lista
configurable de nombres de terceros y solo los permite en `apps/web/src/features/integrations/**`,
`supabase/functions/integration-*/**`, `docs/integraciones-y-migracion.md`, `docs/ESTADO.md` y
`docs/decisions/**`.
