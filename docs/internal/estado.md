# Axia — Estado del proyecto

> Memoria de trabajo entre sesiones. Mantenerla corta: el detalle cronológico vive en
> [`CHANGELOG.md`](../../CHANGELOG.md) y las decisiones en [`../decisions/`](../decisions/).

**Última actualización:** 2026-10-31
**Fase actual:** migración cerrada; Axia funciona sobre su stack propio.

## En curso

Implementación de la consolidación aprobada en la auditoría, en rama propia:

1. Separar desarrollo, integración y E2E; proteger reinicios y simplificar arranque/demo.
2. Unificar la imagen y la versión de app/migrador; cerrar contrato de configuración.
3. Coordinar respaldos y restauración con pruebas de fallo y destino vacío.
4. Añadir integridad de migraciones y corregir selección de pruebas.
5. Automatizar instalación/actualización/recuperación del stack local en CI y empaquetar releases.
6. Actualizar guías/ADR, pasar chequeos, revisar el conjunto y guardar commits pequeños.

## Hecho

- **Auditoría de estructura (2026-10-31):** Compose separa correctamente `db`, `migrate` y `app`;
  conviene conservar el stack. Se documentaron riesgos del reset E2E sin base exclusiva, publicación
  independiente de dos `latest`, respaldo de base/archivos sin punto común y configuración omitida
  por Compose. También contradicciones de demo/setup y huecos del selector de pruebas.
  Pasaron `test:scripts` con entorno vacío, validación de ambos Compose con valores ficticios,
  `check:docs` (131 archivos, 0 enlaces rotos), `check:agnostic` (850 archivos, 0 coincidencias),
  `test:affected` documental y `git diff --check`. El selector requirió ejecución fuera del sandbox
  tras `spawnSync git EPERM`. No se ejecutaron E2E, integración ni la compuerta completa; no se
  tocaron bases ni secretos. Sin ADR nuevo: son propuestas, no decisiones adoptadas.
- **Stack propio:** PostgreSQL 17 + Drizzle + Fastify 5 + TypeScript. Un solo servidor sirve la API
  y el SPA; Compose define `db`, `migrate` y `app`.
- **Núcleo:** autenticación local, autorización por permisos y ámbitos, ciclo completo del tiquet,
  evidencias TUS/Sharp, tiempo real con SSE, cola offline y tiempos por acción.
- **Administración:** usuarios, roles, catálogos, calendarios, configuración de instancia, ámbitos,
  designaciones y métricas. Las cuentas se pueden desactivar o eliminar: sin historial se borran y
  con historial se archivan para conservar la bitácora. Los catálogos se exportan e importan en un
  único XLSX idempotente (ADR 0094), con clasificación en columnas (ADR 0096), dependencias con
  ubicación obligatoria (ADR 0097) y equipo asignado al problema (ADR 0098).
- **Instalación y respaldos:** `scripts/install.sh`, respaldo de base y evidencias, y restauración
  probada.
- **Despliegue con Compose:** `compose.yaml` exige una release `AXIA_IMAGE` compartida por app y
  migrador; app solo se alcanza en la red externa del proxy. El paquete fija digest, y la publicación
  depende de la CI del mismo commit. Desarrollo usa Compose autónomo y `.env.dev`; pruebas usa otro
  proyecto tmpfs y bases separadas. ADR 0099 consolida estos recorridos.
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
- Configurar dominio y TLS en Nginx Proxy Manager o Cloudflare Tunnel; apuntarlo a `axia:3100` en la
  red `proxy`.
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
