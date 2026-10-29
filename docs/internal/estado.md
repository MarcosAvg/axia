# Axia — Estado del proyecto

> Memoria de trabajo entre sesiones. Mantenerla corta: el detalle cronológico vive en
> [`CHANGELOG.md`](../../CHANGELOG.md) y las decisiones en [`../decisions/`](../decisions/).

**Última actualización:** 2026-10-29
**Fase actual:** migración cerrada; Axia funciona sobre su stack propio.

## En curso

Nada en curso. La compuerta completa está en verde sobre `main`.

**Siguiente:** puesta en marcha real (servidor, TLS y el proxy elegido), respaldos programados y
prueba de restauración en el host definitivo. Si se decide, Web Push y escalamiento programado.

## Hecho

- **Stack propio:** PostgreSQL 17 + Drizzle + Fastify 5 + TypeScript. Un solo servidor sirve la API
  y el SPA; Compose define `db`, `migrate` y `app`.
- **Núcleo:** autenticación local, autorización por permisos y ámbitos, ciclo completo del tiquet,
  evidencias TUS/Sharp, tiempo real con SSE, cola offline y tiempos por acción.
- **Administración:** usuarios, roles, catálogos, calendarios, configuración de instancia, ámbitos,
  designaciones y métricas.
- **Instalación y respaldos:** `scripts/install.sh`, respaldo de base y evidencias, y restauración
  probada.
- **Despliegue con Compose:** `compose.yaml` descarga las imágenes de GHCR, publica `app` solo en
  loopback y ejecuta `migrate` antes de arrancar. El `.env` de producción es mínimo; el desarrollo
  usa `compose.dev.yaml` y `.env.dev.example`. El contrato de proxy, la rotación de logs y el
  hardening de `app` están documentados, y CI valida Compose y construye la imagen.
- **UI:** escritorio y móvil por rol, navegación inferior, temas y regresión visual.
- **Calidad:** Vitest contra PostgreSQL real, Playwright, fronteras de dependencias, knip y
  verificación de enlaces.

## Decisiones vigentes

El índice completo está en [`../decisions/README.md`](../decisions/README.md). Las más recientes:
ADR 0085 a 0092 (ciclo del tiquet, evidencia por tipo, retención, métricas y móvil por rol).

## Verificación

```bash
pnpm check:fast   # ciclo local
pnpm check        # antes de integrar
```

Para el ciclo local usar `pnpm check:fast` y `pnpm test:affected`. La compuerta completa incluye
lint, tipos, independencia del núcleo, fronteras, knip, Vitest, Playwright, integración contra
PostgreSQL real y build. Requiere `MIGRATION_DATABASE_URL`, `AXIA_APP_PASSWORD` y `DATABASE_URL`;
Playwright prepara su propia base con la semilla demo. Se ejecuta una vez antes de integrar.

## Pendientes operativos

- Descargar y arrancar las imágenes de GHCR en un host limpio.
- Configurar dominio, TLS y el reverse proxy elegido; apuntarlo a `127.0.0.1:3100` y activar
  `TRUST_PROXY=true`.
- Programar respaldos de base y evidencias, con prueba de restauración trimestral.
- Programar `deploy/scripts/cleanup.sh` junto con los respaldos (cron de ejemplo en
  `docs/guides/operacion.md`).
- Revisar logs, monitorización y espacio en disco.
- Decidir si se implementan Web Push, escalamiento y adaptadores de importación.

## Pendientes de producto

- La barra de acciones se calcula en el cliente con permiso + estado; no conoce ámbito,
  participación ni ventana de reclamación. Conviene migrarla a acciones calculadas por el servidor.
- `open_claim` sobre `closed` se ofrece sin comprobar la ventana de reclamación; el servidor lo
  rechaza con 409 cuando ya venció.
