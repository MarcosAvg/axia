# Axia

[![CI](https://github.com/MarcosAvg/axia/actions/workflows/ci.yml/badge.svg)](https://github.com/MarcosAvg/axia/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-24-brightgreen.svg)](.nvmrc)

Plataforma **propia y autónoma** de seguimiento de tiquets de mantenimiento: en todo momento se sabe
en qué paso está cada tiquet y, si no avanza, **por qué** y en qué estado está ese motivo, con
evidencias en cada paso. Multiusuario, con roles, PWA para escritorio y móvil, uso sin conexión en
campo, autoalojable y open source.

El núcleo es **agnóstico**: funciona completo por sí solo. Las integraciones con otros sistemas son
adaptadores opcionales y no forman parte del núcleo.

## Para quién es

Axia está dirigida a equipos de mantenimiento que necesitan registrar solicitudes, asignar trabajo,
justificar demoras y medir tiempos sin depender de una plataforma externa. También sirve como base
autoalojable para instituciones que requieren control de sus datos.

## Primer paso

- Instalación y primer administrador: [`docs/start/instalacion.md`](docs/start/instalacion.md).
- Operación, respaldos y despliegue: [`docs/guides/operacion.md`](docs/guides/operacion.md).
- Flujo de un tiquet: [`docs/guides/uso.md`](docs/guides/uso.md).
- Índice completo: [`docs/README.md`](docs/README.md).

## Arquitectura

- **`apps/web`**: PWA en Vite + React + TypeScript. Las rutas se organizan con TanStack Router y los
  datos con TanStack Query. Los componentes no llaman al servidor: usan `features/*/api`.
- **`apps/server`**: un único servidor Fastify con PostgreSQL 17, Drizzle, autenticación local,
  API de tiquets, SSE, evidencias TUS/Sharp y sincronización offline.
- **`deploy`**: scripts de operación y respaldos. El despliegue real lo ejecuta la persona.
- **`docs`**: especificación de negocio, modelo de datos, convenciones, ADR y estado del proyecto.

La autorización vive en el servidor y se aplica con `can`/`canAct` y repositorios con alcance. Cada cambio de estado pasa por una acción del servidor y escribe un evento
en la misma transacción.

## Instalar una instancia

En producción solo se necesitan Docker Engine, Compose v2 y un reverse proxy con TLS. No se
necesitan Node.js, pnpm ni compilar código en el servidor.

El workflow de release verifica el commit completo, publica una única imagen y adjunta el paquete
`axia-self-hosted.tar.gz` con Compose, plantilla de entorno y scripts operativos. Su plantilla fija
la imagen por digest; aplicación y migrador usan exactamente el mismo artefacto.

La instalación, red del proxy y primer administrador están en
[`deploy/README.md`](deploy/README.md). La actualización y recuperación están en
[`docs/guides/operacion.md`](docs/guides/operacion.md).

## Desarrollar

Requisitos: Node.js 24, pnpm 12, Git, Docker/Compose y `openssl`.

```bash
pnpm install
./scripts/install.sh
pnpm dev
```

El instalador genera `.env.dev`, prepara PostgreSQL y aplica migraciones; no inicia HTTP.
`pnpm dev` arranca la API y la web con recarga automática, y usa solo PostgreSQL en Docker.
El proyecto de desarrollo (`axia-dev`) es independiente de producción. Si el puerto `5433` ya lo
usa una instalación anterior, se elige otro puerto antes de preparar el entorno.

La demo es opcional: `./scripts/install.sh --demo` crea `demo.admin` y los demás usuarios ficticios.
Sin demo, la primera cuenta se crea desde la pantalla de primer arranque. La contraseña demo se
comunica al sembrar o se obtiene de `AXIA_DEMO_PASSWORD`; no hay un bypass de autenticación.

No se sobrescribe ni se convierte automáticamente una instalación anterior con `.env`. Los pasos
y opciones están en [`docs/start/instalacion.md`](docs/start/instalacion.md).

## Probar

```bash
pnpm test:db:start
pnpm check:fast
pnpm check
pnpm test:db:stop
```

Las pruebas no descubren archivos `.env` privados. PostgreSQL de pruebas tiene otro proyecto,
puerto `55433` y datos desechables; integración usa `axia_test` y navegador `axia_e2e` con API
`3101` y web `5174`. Los destinos se validan antes de reiniciarlos.

`pnpm check` es la compuerta completa. El smoke operativo de Docker, además de esa compuerta,
comprueba instalación vacía, actualización del historial de migraciones, backup, restauración en
otro proyecto, login y conservación de archivos. Se ejecuta en CI con la imagen construida.

La lista de comandos está en [`docs/reference/comandos.md`](docs/reference/comandos.md).

## Estructura

```
axia/
├── apps/web/          → PWA
├── apps/server/       → Fastify, Drizzle, API, SSE y evidencia
├── deploy/            → scripts de operación y respaldos
├── docs/              → negocio, convenciones, ADR y estado
├── scripts/           → instalación, E2E y verificaciones
└── .github/workflows/ → CI
```

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/README.md`](docs/README.md) | Índice de la documentación |
| [`docs/concepts/negocio.md`](docs/concepts/negocio.md) | Fuente de verdad del negocio |
| [`docs/concepts/dominio.md`](docs/concepts/dominio.md) | Flujo, modelo conceptual y glosario |
| [`docs/concepts/datos.md`](docs/concepts/datos.md) | Diseño de la base |
| [`docs/start/instalacion.md`](docs/start/instalacion.md) | Requisitos, instalación y primer administrador |
| [`docs/reference/convenciones-codigo.md`](docs/reference/convenciones-codigo.md) | Estructura y estilo |
| [`docs/internal/estado.md`](docs/internal/estado.md) | Estado y decisiones abiertas |
| [`docs/guides/operacion.md`](docs/guides/operacion.md) | Despliegue, respaldos y restauración |
| [`docs/decisions/`](docs/decisions/) | ADR y decisiones vigentes |

## Despliegue

`compose.yaml` separa `db`, `migrate` y `app`; esta última publica la API y el SPA. Los datos y
las evidencias tienen volúmenes diferentes. La app no publica puertos del host; el proxy del
operador accede por una red externa elegida mediante `AXIA_PROXY_NETWORK`.

Las versiones se eligen con `AXIA_IMAGE`. Antes de actualizar se conserva un conjunto de respaldo
consistente; volver a un tag antiguo no revierte cambios de base. Las guías operativas describen
la recuperación en un destino vacío. El agente prepara y verifica localmente estos recorridos;
las operaciones del servidor real corresponden al operador.

## Contribución

Las normas de ramas, commits y compuerta están en [`CONTRIBUTING.md`](CONTRIBUTING.md). El proyecto
se rige por [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md); los problemas de seguridad se reportan según
[`SECURITY.md`](SECURITY.md).

## Licencia

MIT. Ver [`LICENSE`](LICENSE).
