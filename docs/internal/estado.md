# Axia — Estado del proyecto

Memoria de continuidad. El historial vive en [CHANGELOG](../../CHANGELOG.md), las razones técnicas
en [arquitectura](../concepts/arquitectura.md) y los [ADR](../decisions/README.md).

**Última actualización:** 2026-10-31

## Publicación cerrada: v0.5.1

- `main` subido; release e imagen publicadas desde `63c7488`. `v0.5.0` permanece intacta:
  su flujo falló antes de publicar porque una prueba exigía ripgrep, ausente en el runner.
- Corrección mínima: `grep -E` conserva todos los patrones y aserciones. Reproducción local sin
  ripgrep RED→GREEN y revisión independiente sin hallazgos. `check:fast` y `test:affected`
  (seleccionó `pnpm check`) código 0: 46 Node, 57 servidor, 298 web, 52 navegador y 243 PostgreSQL.
- [Flujo de release](https://github.com/MarcosAvg/axia/actions/runs/41250305586): comprobación
  general, Docker y publicación con resultado `success`, incluida recuperación real.
- [Release v0.5.1](https://github.com/MarcosAvg/axia/releases/tag/v0.5.1): paquete y checksum
  descargados y verificados. Identidad, README y OPERATIONS presentes; sin archivo `.env` privado.
- Imagen pública `ghcr.io/marcosavg/axia/axia-app:v0.5.1`; digest confirmado en GHCR y coincidente
  con `release.json`: `sha256:d903736d59a028540760edd69f7c018ff7f358b5e06908dcb59f9e656ad07b8d`.
- Sin despliegue ni cambios en infraestructura de producción. Siguiente: prueba en host limpio.

## Tarea cerrada

Rediseño documental completado: una entrada por tarea, procedimientos y contratos contrastados,
83 ADR consolidados con originales en Git y desarrollo separado de instalación. Especificación de
negocio intacta; sin cambios funcionales, dependencias ni SQL. Revisión independiente cerrada tras
corregir el contrato de prioridad y conservar la restricción de sesión por contraseña temporal.

## Base disponible

- PostgreSQL 17, Drizzle, Fastify 5 y SPA React; un servidor sirve web y API. Compose separa base,
  migrador y app. Desarrollo, integración y navegador usan entornos independientes (ADR 0099).
- Autenticación local, permisos/ámbitos, ciclo del tiquet, evidencias, SSE, cola offline,
  administración y métricas. La [especificación de negocio](../concepts/negocio.md) es normativa.
- Migraciones SQL como definición de base; contratos HTTP validados, métricas con alcance común y
  dependencias offline por tiquet (ADR 0100). La migración 0017 retira estructuras sin consumo y
  aborta ante datos o dependencias inesperadas (ADR 0101).
- Instalación local y recuperación en volúmenes nuevos verificadas en la tarea anterior;
  release pública verificada; arranque en infraestructura real todavía pendiente.
- Documentación consolidada por tareas (ADR [0102](../decisions/0102-documentacion-por-tareas.md));
  antiguos documentos y decisiones se recuperan mediante el [índice histórico](../history/README.md).

## Verificación de esta tarea

- `AXIA_ENV_FILE=/dev/null pnpm check:fast`: código 0; lint, tipos y 355 pruebas verdes.
- `AXIA_ENV_FILE=/dev/null pnpm test:affected`: seleccionó `pnpm check`, código 0; 46 pruebas Node,
  scripts Bash, 57 servidor, 298 web, 52 navegador y 243 PostgreSQL; estáticos y build verdes.
- `pnpm check:docs`: 34 documentos y cero enlaces rotos (antes 117 documentos).
- Paquete operativo: dos pruebas existentes verdes y generación real comprobada; README/OPERATIONS
  presentes y enlaces locales válidos. Formato y `git diff --check` sin errores.
- SHA-256 de negocio sin cambios. Persiste aviso previo de chunks >500 kB en build.
- Rediseño integrado y subido; publicación posterior registrada arriba. Sin despliegue real.

## Siguiente: diferencias de producto documentadas

La documentación describe el código disponible sin cambiar las reglas aprobadas. Revisar cada
brecha contra negocio y añadir regresiones al implementarla:

- RN27: una acción offline tardía rechazada/conflictiva no deja el evento sin efecto requerido.
- RN17: recaptura limitada a registrado/con supervisor/asignado; no durante reclamación y sin
  motivo obligatorio. RN06: reasignación directa a supervisor termina en `with_supervisor`.
- Tipo de servicio opcional en la API de alta/atención; la UI lo exige al atender.
- `auto_validation_days` configurable sin tarea automática; tampoco hay Web Push ni escalamiento.
- Acciones visibles calculadas en cliente sin ámbito/participación/ventana de reclamación; el
  servidor rechaza acciones inválidas. `open_claim` puede ofrecerse fuera de plazo.

## Pendientes operativos

- Probar descarga/arranque de release en host limpio y configurar dominio/TLS en el proxy.
- Programar respaldo coordinado, limpieza, restauración periódica y monitorización de disco/logs.
- Infraestructura real requiere autorización de la persona. Sin credenciales ni reglas de negocio
  pendientes para terminar el rediseño documental.
