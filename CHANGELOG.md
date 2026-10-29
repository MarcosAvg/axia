# Changelog

Todos los cambios relevantes se documentan en este archivo. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa versionado semántico.

## [Unreleased]

### Añadido

- Stack propio con PostgreSQL 17, Drizzle, Fastify 5 y TypeScript.
- Autenticación local con usuario y contraseña, sesiones opacas, bloqueo por intentos y primer
  arranque.
- Autorización central por permisos y ámbitos, con repositorios de tiquets y respuestas opacas.
- API de tiquets: alta, ruteo, ofertas, asignación, inicio, pausa con subestados, atención,
  validación, rechazo, cancelación, prioridad, comentarios, duplicados, reactivación, recaptura,
  reclamaciones, reasignación, apoyo auxiliar y calificación.
- Evidencias con TUS, Sharp, normalización WebP, miniaturas, cuota y entrega autenticada.
- Tiempo real con `LISTEN/NOTIFY`, SSE, recuperación de eventos y bandeja in-app.
- Sincronización offline con cola Dexie, UUID de cliente, `occurredAt` y bloqueo de dependientes.
- Administración de usuarios, roles, catálogos, calendarios, ámbitos y configuración de instancia.
- Indicadores de tiempos, SLA, duplicados, satisfacción, carga por técnico y ruteo.
- Semilla de referencia en migraciones y semilla demo explícita, idempotente y sin contraseña fija.
- Instalación con secretos generados, Compose `db`/`migrate`/`app`, respaldos de base y evidencias.
- Compose de producción con imágenes de GHCR, `.env` mínimo y publicación de `app` solo en loopback
  para conectar un reverse proxy del host, sin incluirlo en el repositorio.
- Documentación organizada por audiencia y verificación de enlaces con `pnpm check:docs`.

### Corregido

- Ciclo del tiquet: la recaptura usa las claves correctas, guarda su nota y se limita a antes de
  iniciar; reasignar cierra la pausa, el trabajo activo y la participación anterior; los descartes
  fijan el cierre, las reclamaciones abiertas se resuelven, la reactivación limpia el duplicado y
  una reclamación procedente limpia la fecha de cierre.
- Evidencia: se autoriza por tipo y por la acción (`claim` con la reclamación, `request` con la
  autoría del tiquet, trabajo con el avance). El solicitante puede reclamar y adjuntar la foto de su
  solicitud; los errores de subida ya no dejan una evidencia pendiente local.
- Compose: el healthcheck de PostgreSQL usa TCP y no se adelanta durante la inicialización. El primer
  `up` ya no arranca `migrate` antes de que la base esté lista.

### Cambiado

- La PWA usa la API propia y el servidor sirve el SPA compilado.
- La compuerta de calidad usa PostgreSQL real, Vitest y Playwright.
- La documentación se reorganizó en inicio, guías, referencia, conceptos, decisiones e histórico.
- UI móvil: barra superior y administración adaptadas de 320 a 1440 px, con tarjetas para catálogos,
  ámbitos y designaciones; objetivos táctiles, contraste, movimiento reducido, jerarquía de
  encabezados y títulos de pestaña corregidos.
- La búsqueda global muestra un estado vacío; la tarjeta de Integraciones indica que no está
  disponible en esta versión.
- La regresión visual se actualizó a la interfaz actual e incluye una captura del panel móvil.
- Administración de cuentas: alta con roles, contraseña temporal visible una sola vez,
  restablecimiento de contraseña, revocación de sesiones y último acceso.
- Cambio de contraseña desde el perfil, mensaje claro de bloqueo por intentos, error de estado de
  instalación con reintento y cierre de sesión ante respuestas 401.
- Avisos in-app: campana con no leídas, ruta `/avisos`, marcar uno o todos, folio del tiquet y
  actualización en vivo por SSE con recuperación de eventos perdidos. Se corrigió el filtro de
  eventos SSE de solicitantes, que comparaba caracteres en vez de nombres de evento.
- Detalle del tiquet: estado como insignia, orden móvil acciones → estado → actividad →
  evidencias, visor de evidencias con imagen completa y validación por campo de las acciones
  incompletas antes de enviarlas.
- Navegación por rol: Mi trabajo solo con perfil de técnico, Bandeja solo con permiso de tomar
  ofertas, “Nuevo tiquet” solo con permiso de creación y administración alineada con sus permisos
  específicos. El panel deja de consultar métricas y ofertas que el rol no puede ver.
- Tiempos por acción: la hora manual solo se ofrece al actuar a nombre de un técnico o al registrar
  un tiquet a nombre de otra persona. Las acciones directas y el alta propia usan la hora del
  servidor. La hora de un evento puede ajustarse desde la línea de tiempo con validación de vecinos
  y reconstrucción de tramos.
- Proxy del técnico: la API vuelve a recibir y guardar el `subjectTechnicianId`, valida
  `act_on_behalf` por alcance y la participación en el tiquet, y exige sujeto para aceptar
  `occurredAt` en una acción.
- Pruebas por cambio: `check:fast`, `test:affected`, smoke E2E y compuerta completa reservada al
  cierre; la integración reutiliza una base plantilla ya migrada.
- Arranque en desarrollo: React Compiler solo se aplica al compilar (ADR 0083) y la cola offline se
  carga cuando hay sesión. La pantalla de acceso ya no descarga el feature completo de tiquets.
- `pnpm dev:api` y el servidor E2E guardan evidencias en el repositorio, no en `/data/evidence`, que
  solo existe dentro del contenedor. Esto corrige el error de instalación en el login local.
- Compose: producción descarga las imágenes de GHCR, conecta `app` a la red `proxy`, publica
  `127.0.0.1:3100` y ejecuta `migrate` antes de arrancar. El `.env` de producción es mínimo, el
  desarrollo usa `.env.dev.example` y `compose.dev.yaml`, y CI valida Compose y construye la imagen.
  Se mantienen rotación de logs, cierre ordenado de PostgreSQL y hardening de `app`.

### Retirado

- El runtime y las herramientas del stack anterior.
- La suite de pruebas ligada al esquema anterior; las invariantes se prueban contra PostgreSQL real.
- Las importaciones e integraciones externas quedan deshabilitadas en esta versión.

## [0.0.0] - 2026-10-21

Versión inicial en desarrollo.
