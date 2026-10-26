# Axia — Estado del proyecto

> El agente lee este archivo al iniciar cada sesión y lo actualiza al terminar cada tarea.
> Es la memoria del proyecto entre sesiones. Mantenlo corto y verídico.

**Última actualización:** 2026-10-26
**Fase actual:** migración cerrada; Axia funciona sobre su stack propio.

## En curso

**Sin trabajo en curso.** El lote de rendimiento (indicadores, actor/sesión y SSE) está integrado a
`main`, con la compuerta completa en verde.

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
- **Tiempos por acción:** la hora manual solo se ofrece al actuar a nombre de un técnico o al
  registrar el tiquet a nombre de otra persona; las acciones directas usan la hora del servidor.
  Administrador y supervisor pueden ajustar cualquier evento de la línea de tiempo con validación
  de vecinos, auditoría `event_time_corrected` y reconstrucción de tramos (ADR 0081 y 0084).
- **Proxy del técnico:** la API recibe `subjectTechnicianId` en las acciones de técnico, valida
  `act_on_behalf` por alcance y la participación, y guarda actor y sujeto por separado. La hora
  manual exige sujeto.
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
- **Arranque en desarrollo:** React Compiler solo al compilar (ADR 0083) y la cola offline se carga
  cuando hay sesión; `/login` pasó de 6.47 s y 207 módulos a 1.74 s y 99 módulos en frío. `dev:api`
  usa `apps/server/data/evidence` en local en lugar de la ruta `/data/evidence` del contenedor.
- **Corrección del ciclo (auditoría 2026-10-25):** recaptura con contrato `camelCase`, nota y
  reruteo por cambio de equipo/edificio, limitada a antes de iniciar; la reasignación de supervisor
  cierra pausa y trabajo activo; se terminan las participaciones al reasignar técnico; los descartes
  fijan `closed_at` y cierran reclamaciones abiertas; la reactivación limpia el vínculo de
  duplicado; la reclamación procedente limpia `closed_at`; apoyo auxiliar restringido a trabajo en
  curso; asignación desde `registered` con oferta registra la toma y la reasignación emite
  `reassigned_technician` (ADR 0085).
- **Evidencia por tipo (2026-10-25):** `claim` se autoriza con `ticket.open_claim`; `request` con la
  autoría del tiquet; `before`/`during`/`after` con `ticket.record_progress` o `evidence.attach`.
  El solicitante ya puede abrir reclamaciones y adjuntar la foto de su solicitud; los errores de
  dominio limpian la fila local y la foto fallida muestra un aviso (ADR 0086).
- **Corrección de la auditoría (2026-10-25):** los cambios de rol exigen `role.manage`; se protegió
  al último administrador en las rutas de acceso y el rol Administrador ya no se desactiva desde la
  API (ADR 0087). La validación llena el lado del solicitante sin cuenta o cuando se actúa con
  `ticket.validate_on_behalf`, la recaptura acepta limpiar campos opcionales y la evidencia solo
  cuenta si está `ready`. La cola offline y las fotos quedan separadas por usuario del dispositivo,
  se borran del dispositivo al subirse y ya no reintentan errores definitivos. Se retiró el cliente
  de sincronización por lote que no se usaba.
- **Evidencias y recaptura (2026-10-25):** la cuota se comprueba al iniciar la subida, no después de
  escribir el archivo. `pnpm db:cleanup-evidence` elimina subidas abandonadas y marca la fila como
  `failed` sin borrarla (RN-22). La recaptura valida que la ubicación pertenezca al edificio, la
  subcategoría a la categoría y el problema a la subcategoría; solo valida lo que cambió.
- **Rendimiento (2026-10-26):** `GET /api/metrics/summary` calcula resumen, grupos, volumen y
  antigüedad en una consulta con `GROUPING SETS` sobre una CTE materializada; el panel pide
  `compact=1` y ya no descarga el histórico. Se retiró `/api/metrics/tickets` y la agregación en el
  navegador. La carga del actor es una sola consulta y la sesión solo se actualiza al vencer el
  intervalo de toque. El SSE agrupa suscriptores por actor, comprueba la visibilidad una vez por
  actor y serializa los eventos (ADR 0088).
- **Pruebas:** 48 unitarias/HTTP del servidor, 240 web, 38 Playwright y 171 de integración contra
  PostgreSQL real. `pnpm check` completo en verde.
- **Documentación:** estructura por audiencia (`start`, `guides`, `reference`, `concepts`), ADR
  vigentes y archivo histórico, verificación de enlaces con `pnpm check:docs`.

## Decisiones vigentes

- **ADR 0088:** indicadores agregados en SQL, actor en una consulta, sesión sin toque innecesario y
  SSE agrupado por actor.
- **ADR 0086:** la evidencia se autoriza por tipo y por la acción que la justifica (`claim` con
  `ticket.open_claim`, `request` con la autoría del tiquet, trabajo con `ticket.record_progress`).
- **ADR 0085:** correcciones del ciclo de vida: recaptura antes de iniciar y con reruteo, cierre de
  pausa/participación al reasignar, `closed_at` en descartes y limpieza del vínculo al reactivar.
- **ADR 0083:** React Compiler solo al compilar; en desarrollo se puede forzar con
  `AXIA_REACT_COMPILER=1`.
- **ADR 0082:** pruebas por cambio, ciclo local rápido y compuerta completa al cierre.
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
pnpm check:fast   # ciclo local
pnpm check        # antes de integrar
```

Para el ciclo local usa `pnpm check:fast` y `pnpm test:affected`. La compuerta completa incluye
lint, tipos, independencia del núcleo, fronteras, knip, Vitest, Playwright, integración contra
PostgreSQL real y build. Requiere `MIGRATION_DATABASE_URL`, `AXIA_APP_PASSWORD` y `DATABASE_URL`;
Playwright prepara su propia base con la semilla demo. Se ejecuta una vez antes de integrar.

## Pendientes operativos

- Construir y arrancar la imagen Docker completa en un host limpio.
- Configurar dominio, TLS, reverse proxy y `TRUST_PROXY` si corresponde.
- Programar respaldos de base y evidencias, con prueba de restauración trimestral.
- Programar `db:cleanup-evidence` (o el comando del contenedor) junto con los respaldos.
- Revisar logs, retención, monitorización y espacio en disco.
- Decidir si se implementan Web Push, escalamiento y adaptadores de importación.

## Pendientes de producto

- La barra de acciones se calcula en el cliente con permiso + estado; no conoce ámbito,
  participación ni ventana de reclamación. Conviene migrarla a acciones calculadas por el servidor.
- `open_claim` sobre `closed` se ofrece sin comprobar la ventana de reclamación; el servidor lo
  rechaza con 409 cuando ya venció.
- El permiso `ticket.reopen` no lo usa ninguna acción: decidir si se retira o se implementa una
  reapertura explícita.
- `docs/concepts/negocio.md` §4 sigue listando `pending_recapture`, que la decisión 7 no implementa.
