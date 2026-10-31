# Axia — Estado del proyecto

> Memoria de trabajo entre sesiones. Mantenerla corta: el detalle cronológico vive en
> [`CHANGELOG.md`](../../CHANGELOG.md) y las decisiones en [`../decisions/`](../decisions/).

**Última actualización:** 2026-10-31
**Fase actual:** migración cerrada; Axia funciona sobre su stack propio.

## En curso

Sin implementación abierta. Limpieza histórica verificada; siguientes trabajos en los pendientes
operativos y de producto. No hay preguntas técnicas bloqueantes.

## Hecho

- **Retirada histórica (2026-10-31):** veinte documentos antiguos fuera del checkout y ADR con
  implementación sustituida clasificados como parciales; recuperación desde Git en el índice
  histórico. Nueva migración 0017 retira ocho tablas y once funciones sin consumidores; bloquea
  escrituras concurrentes y aborta ante datos/dependencias inesperadas, sin pérdida ni DDL parcial.
  Conserva referencias externas, garantías del núcleo y compatibilidad de datos. ADR
  [0101](../decisions/0101-retirada-historica.md) documenta retirada y cambio de recuentos de pruebas.
  Revisión independiente cerrada sin hallazgos; regresiones RED→GREEN incluidas para cada tabla y
  escritura concurrente. `AXIA_ENV_FILE=/dev/null pnpm check:fast` y `pnpm db:test` verdes (243 DB).
  `pnpm test:affected` seleccionó `pnpm check`: ejecución final código 0, 46 Node y scripts Bash,
  57 servidor, 298 web, 52 navegador y 243 PostgreSQL; lint/tipos/estáticos/build en verde.
  Primera compuerta: fallaron `claims.spec.ts` (registro con foto, carga de módulo) y
  `metrics.spec.ts` (filtro edificio, formulario de acceso no visible) mientras se ejecutaba Docker.
  Ambos pasaron por separado (2/2) y toda la compuerta se repitió sin operaciones Docker
  concurrentes; no se cambiaron pruebas ni límites. No se confirmó una causa única de esos fallos.
  Imagen local verificada por smoke real: instalación, adopción de historial, respaldo,
  recuperación en volúmenes nuevos, login/evidencia y rechazo de destino ocupado. SHA-256 del SQL
  de la imagen coincide con el checkout. Persiste aviso previo de chunks >500 kB. Sin dependencias
  nuevas, SQL integrado editado, push ni despliegue real. El plan concluido también se conserva
  exclusivamente en Git.
- **Consolidación vigente:** desarrollo independiente con watchers host; pruebas locales tmpfs y
  bases `_test`/`_e2e`; imagen única app/migrador, releases por digest y respaldo/recuperación
  coordinados (ADR 0099). Contratos HTTP validados, comandos tipados, alcance único de métricas,
  dependencias offline por tiquet, SQL como definición completa e inventario Git seguro (ADR 0100).
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
ADR [0099](../decisions/0099-consolidacion-self-hosted.md),
[0100](../decisions/0100-consolidacion-interna.md) y [0101](../decisions/0101-retirada-historica.md):
entornos/operación, contratos/alcance/cola y retirada histórica segura.

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
