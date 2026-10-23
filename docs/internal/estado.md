# Axia — Estado del proyecto

> El agente lee este archivo al iniciar cada sesión y lo actualiza al terminar cada tarea.
> Es la memoria del proyecto entre sesiones. Mantenlo corto y verídico.

**Última actualización:** 2026-10-23
**Fase actual:** migración cerrada; Axia funciona sobre su stack propio.

## En curso

**Sin trabajo en curso.** La hora real por acción quedó integrada y la compuerta está en verde.

**Siguiente:** puesta en marcha real (servidor, TLS, reverse proxy), respaldos programados y prueba
de restauración en el host definitivo. Si se decide, Web Push y escalamiento programado.

## Hecho

- **Stack propio:** PostgreSQL 17 + Drizzle + Fastify 5 + TypeScript. Un solo servidor sirve la API
  y el SPA; Compose define `db`, `migrate` y `app`.
- **Autenticación:** usuario y contraseña, Argon2id, sesiones opacas en base, bloqueo por intentos,
  primer arranque, cambio obligatorio de contraseña y administración de cuentas.
- **Autorización:** `can`/`canAct`, ámbitos por permiso, repositorios con alcance, 404 opacos y
  matriz positiva/negativa por rol.
- **Tiquets:** alta, ruteo y ofertas, toma, asignación, inicio, pausa con subestados, atención,
  validación, rechazo, cancelación, prioridad, comentario, duplicados, reactivación, recaptura,
  reclamaciones, reasignación, apoyo auxiliar y calificación.
- **Evidencias:** TUS, Sharp, normalización WebP, miniaturas, cuota y entrega autenticada.
- **Tiempo real:** `LISTEN/NOTIFY` con conexión dedicada, SSE, catch-up y bandeja in-app.
- **Offline:** cola Dexie, UUID de cliente, `occurredAt`, lote ordenado, resultados
  `applied`/`duplicate`/`rejected`/`conflict`/`blocked` y bloqueo de dependientes.
- **Tiempos por acción:** el alta y las acciones aceptan la hora real; administrador y supervisor
  pueden ajustar cualquier evento de la línea de tiempo con validación de vecinos, auditoría
  `event_time_corrected` y reconstrucción de tramos. Se retiraron los tramos manuales (ADR 0081).
- **Semillas:** referencia en migraciones (catálogos, calendarios, festivos, motivos y reglas) y demo
  explícita, local e idempotente, sin contraseña fija.
- **Administración:** usuarios, roles y permisos, catálogos, calendarios, configuración de instancia,
  ámbitos, designaciones y métricas.
- **Instalación y respaldos:** `scripts/install.sh`, `pg_dump -Fc`, respaldo del volumen de
  evidencias y restauración probada.
- **Corte final:** la PWA usa la API propia, se retiró el stack anterior y se dejó la etiqueta local
  `pre-corte-legacy`.
- **UI (Tanda A):** barra superior y pantallas de administración adaptadas de 320 a 1440 px,
  tarjetas móviles para catálogos/ámbitos/designaciones, objetivos táctiles, contraste de estados,
  `prefers-reduced-motion`, jerarquía de encabezados, títulos de pestaña, estado vacío de búsqueda y
  regresión visual actualizada (incluye panel móvil).
- **UI (Tanda B1):** alta de usuarios con roles, contraseña temporal de una sola vista, restablecer
  contraseña, revocar sesiones, usuario/último acceso en la tabla, cambio de contraseña desde el
  perfil, mensaje de bloqueo de login, error de estado de instalación y cierre de sesión ante 401.
- **UI (Tanda B2):** campana con contador de no leídas en la barra superior, ruta `/avisos`, lista con
  folio del tiquet, enlace al detalle, marcar una o todas y actualización en vivo por SSE con
  recuperación de eventos perdidos al reconectar. Se corrigió el filtro SSE de solicitantes, que
  interpretaba el arreglo de tipos visibles como una cadena de caracteres.
- **UI (Tanda B3):** orden móvil acciones → estado → actividad → evidencias, visor ampliado de
  evidencias sin recorte y validación por campo de las acciones incompletas. La barra de avance se
  retiró; el estado queda como insignia junto al folio.
- **Tanda C1:** vistas por rol y permisos coherentes: `technicianId` en la identidad, “Mi trabajo”
  solo para técnicos, “Bandeja” solo con ofertas, panel sin consultas 403, “Nuevo tiquet” por
  permiso y administración alineada con sus permisos específicos. Ver ADR 0079.
- **Pruebas:** 39 unitarias/HTTP del servidor, 245 web, 38 Playwright y 137 de integración contra
  PostgreSQL real. `pnpm check` en verde; `pnpm test:visual` con 3 capturas en verde.
- **Documentación:** estructura por audiencia (`start`, `guides`, `reference`, `concepts`), ADR
  vigentes y archivo histórico, verificación de enlaces con `pnpm check:docs`.

## Decisiones vigentes

- **ADR 0078:** corte único del frontend y retirada del stack anterior.
- **ADR 0077:** Vitest contra PostgreSQL real como suite principal; pgTAP se retiró con el esquema
  anterior porque probaba RLS/RPC que ya no existen.
- **Migraciones:** SQL propio en `apps/server/db/migrations/` + `drizzle-kit check`. No se usa
  `drizzle-kit generate`.
- **Importaciones e integraciones externas:** deshabilitadas en esta versión. Son opcionales y no
  bloquean el núcleo.
- **Push y escalamiento:** infraestructura pendiente para una etapa posterior.
- **Solicitantes sin cuenta:** no reciben bandeja ni push; el tiquet conserva nombre y contacto.
- **Sin datos reales:** no hubo migración de datos; la instalación nace limpia.

## Verificación

```bash
pnpm check
```

La compuerta incluye lint, tipos, independencia del núcleo, fronteras, knip, Vitest, Playwright,
integración contra PostgreSQL real y build. Requiere `MIGRATION_DATABASE_URL`, `AXIA_APP_PASSWORD`
y `DATABASE_URL`; Playwright prepara su propia base con la semilla demo.

## Pendientes operativos

- Construir y arrancar la imagen Docker completa en un host limpio.
- Configurar dominio, TLS, reverse proxy y `TRUST_PROXY` si corresponde.
- Programar respaldos de base y evidencias, con prueba de restauración trimestral.
- Revisar logs, retención, monitorización y espacio en disco.
- Decidir si se implementan Web Push, escalamiento y adaptadores de importación.
