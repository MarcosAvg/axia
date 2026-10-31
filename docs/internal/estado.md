# Axia — Estado del proyecto

> Memoria de trabajo entre sesiones. Mantenerla corta: el detalle cronológico vive en
> [`CHANGELOG.md`](../../CHANGELOG.md) y las decisiones en [`../decisions/`](../decisions/).

**Última actualización:** 2026-10-31
**Fase actual:** migración cerrada; Axia funciona sobre su stack propio.

## En curso

Sin implementación abierta. Consolidación interna verificada; siguientes trabajos en los pendientes
operativos y de producto. No hay preguntas técnicas bloqueantes.

## Hecho

- **Consolidación interna (2026-10-31):** DTO HTTP actuales validados, comandos discriminados y
  wrappers retirados; métricas intersectan alcance/filtros antes de agregar, conservando permiso
  de cada ruta. Cola offline bloquea dependientes del tiquet entre procesamientos, incluida
  evidencia antigua, y comprueba sesión después de leer/escribir IndexedDB. Retirada copia de
  esquema Drizzle sin consumidores; SQL versionado sigue siendo la definición completa. Inventario
  Git excluye privados, ignorados (también forzados al índice), salidas y symlinks; planificador de
  pruebas puro. ADR [0100](../decisions/0100-consolidacion-interna.md) documenta decisiones y las
  pruebas históricas sustituidas por fronteras/contratos actuales, sin debilitar cobertura.
  Revisión independiente cerrada; corregido su hallazgo de ignorados y las ventanas de sesión con
  regresiones RED→GREEN. `AXIA_ENV_FILE=/dev/null pnpm check:fast` pasó (57 servidor + 298 web).
  `pnpm test:affected` seleccionó `pnpm check`; ejecución final código 0: 46 Node y scripts Bash,
  57 servidor, 298 web, 52 navegador y 231 PostgreSQL, lint/tipos/estáticos/build verdes.
  Docs 135/0 enlaces rotos; independencia 842/0 coincidencias. Compuerta repetida después del
  último ajuste de sesión. Persiste aviso web de chunks >500 kB; sin nuevas dependencias,
  migraciones ni ejecución de despliegues. Las acciones disponibles calculadas por servidor y
  zona horaria de métricas siguen fuera de esta tarea.

- **Consolidación (2026-10-31):** desarrollo `axia-dev` con `.env.dev` y watchers host; pruebas tmpfs
  en `55433`, bases `_test`/`_e2e`, puertos navegador `3101`/`5174` y reinicios protegidos. Demo/setup
  coherentes. Imagen única app/migrador y opciones de sesiones/login/retención efectivas; release
  por digest después de la compuerta y smoke del artefacto exacto. Backup/restore coordinados,
  destino vacío, usuario propietario de evidencias y hashes del historial (migración 0016).
  Revisión independiente: tres hallazgos corregidos con regresiones RED→GREEN; sin menores abiertos.
  `check:fast` pasó; `test:affected` seleccionó `pnpm check` completo y terminó con código 0:
  30 regresiones Node y scripts Bash, 57 unitarias/HTTP servidor, 269 web, 52 E2E y 197 PostgreSQL;
  lint, tipos, estáticos y build en verde. Docs: 133 archivos/0 enlaces rotos; independencia:
  909 archivos/0 coincidencias. Smoke Docker real pasó instalación, actualización de historial,
  respaldo, recuperación en volúmenes nuevos, login/archivo y rechazo de destino ocupado. El build
  mantiene un aviso de chunks web >500 kB, sin fallo ni cambio de límites. GHCR y despliegue real
  no ejecutados; el smoke no certifica saltos arbitrarios entre futuras versiones.
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
PostgreSQL real y build. `pnpm test:db:start` prepara PostgreSQL exclusivo; integración y Playwright
usan conexiones locales seguras por defecto y bases separadas `_test`/`_e2e`, sin descubrir dotenv
privados. Playwright prepara su base con semilla demo. Se ejecuta una vez antes de integrar.

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
