# Changelog

Todos los cambios relevantes se documentan en este archivo. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa versionado semántico.

## [Unreleased]

### Corregido

- El despliegue Docker desactiva el healthcheck heredado en `migrate` y limita sus privilegios; una
  migración larga ya no hace fallar `docker compose up -d --wait`. PostgreSQL usa `shm_size`
  explícito y la documentación exige secretos hexadecimales URL-safe.
- `pnpm dev` detecta los puertos HTTP ocupados antes de arrancar y nombra el proceso en conflicto;
  el servidor deja de quedar vivo tras un `EADDRINUSE`, evitando una web arriba contra una API que
  nunca escuchó.
- La calificación de satisfacción vuelve a guardarse con el rol de aplicación: la inserción es de
  solo agregar y responde 409 si el tiquet ya tiene una, sin exigir `UPDATE` sobre
  `ticket_ratings`.

### Cambiado

- El supervisor debe tomar el tiquet antes de asignar, reasignar, recapturar, rechazar, cancelar,
  cambiar prioridad o marcar duplicado. Se retira la toma implícita al asignar; el administrador
  conserva la cola de tiquets sin ruteo.
- En la política de validación `both`, el solicitante valida primero y el supervisor después.
- El tiempo, la evidencia y el sujeto de la línea de tiempo se atribuyen a la persona proxy
  (técnico o solicitante), no a quien ejecuta la acción. Los reportes por técnico y solicitante
  usan esa atribución; la métrica de reasignaciones cuenta al supervisor destino.

### Añadido

- La calificación se captura en un modal que aparece al validar el solicitante y puede registrarse
  antes del cierre. Las acciones del solicitante que ya validó se cierran mientras el tiquet siga
  atendido y tampoco puede abrir una reclamación, ni tras el cierre; validar de nuevo el mismo rol
  responde 409.
- Reportes de tiempo atribuido por técnico y por solicitante, con desglose de trabajo, pausa y
  espera; la reconstrucción histórica rellena el sujeto de los tramos existentes.

## [0.6.0] - 2026-10-31

### Eliminado

- Ocho tablas del importador retirado y once funciones SQL de métricas sin consumidores mediante
  una migración nueva; los datos históricos o dependencias inesperadas abortan la actualización.
- Veinte documentos exclusivamente históricos del checkout; contenido recuperable desde Git
  mediante el índice histórico, sin duplicar los archivos.
- Plan de esta limpieza al concluir; la versión final y su evidencia también se consultan en Git.

### Corregido

- El detalle del tiquet ya no mezcla el estado del tiquet con el de sus candidatos; al marcar un
  duplicado se descartan las alertas recíprocas.
- Catálogos iniciales de pausa completos y comprobación de salida antes de pausar; edición de
  motivos validada y protegida mientras haya pausas abiertas. Alta activa por defecto, padres
  compatibles, selectores actualizados y errores de captura comprensibles.
- Demo con ofertas utilizables, evidencias ficticias privadas, validaciones y participación
  coherentes; reaplicar recupera ruteo ausente de escenarios intactos sin reescribir historial.

- Pruebas de respaldo/recuperación ejecutables sin ripgrep en runners de CI; mismas aserciones
  y expresiones regulares extendidas con `grep -E`.

### Cambiado

- Configuración de duplicados con ventana, umbral y campos visibles; los tipos de evento se leen
  como arreglo.
- Documentación organizada por tareas, con una referencia vigente por tema; desarrollo separado de
  instalación, contratos contrastados con el código y 83 ADR anteriores conservados en Git.

- Decisiones con implementación sustituida clasificadas como parciales; referencias al stack
  vigente, al XLSX y al esquema instalado corregidas. Smoke compara imagen y SQL del checkout.

### Añadido

- Catálogos administrables con datos derivados, árbol de motivos, orden por etiqueta y última
  actualización; borrado de registros sin uso con conflicto explicado.
- Detección de duplicados configurable, revisión con decisiones auditadas, aviso destacado, badge y
  candidatos al marcar; relleno de tiquets abiertos y descarte de alertas recíprocas.
- Consolidación interna: DTO HTTP de tiquets validados y comandos tipados; métricas con alcance y
  filtros comunes antes de agregar; bloqueo offline por tiquet entre reintentos, incluida evidencia.
- Una sola definición de base en migraciones SQL, sin introspección Drizzle sin consumo;
  verificadores limitados a fuentes Git seguras y planificador de pruebas puro (ADR 0100).

- Entornos independientes de desarrollo, integración y navegador; conexiones y reinicios protegidos,
  pruebas sin descubrimiento de dotenv privado y arranque de desarrollo con ambos watchers.
- Una imagen verificada para app/migrador y paquete operativo de release fijado por digest, sin
  herramientas de desarrollo en el servidor; configuración explícita de sesiones/login/retención.
- Conjuntos coordinados de backup con manifiesto y hashes, recuperación transaccional sobre destino
  vacío y prueba real de instalación, actualización de historial y recuperación de datos/archivos.
- Huellas SHA-256 para migraciones, adopción compatible del historial anterior y rechazo de SQL
  aplicado cambiado o ausente; correcciones del selector de pruebas y recorridos demo/setup.

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
- Compose de producción con imágenes de GHCR, `.env` mínimo y `app` solo en la red `proxy` como
  `axia:3100`, sin incluir proxy ni túnel en el repositorio.
- Eliminación de usuarios: las cuentas sin historial se borran y las que participaron en tiquets se
  archivan para conservar la bitácora.
- Exportación e importación de todos los catálogos en un único XLSX idempotente, con referencias por
  nombre y reporte por fila.
- Dependencias solicitantes vinculadas a una o varias ubicaciones (N:M), con filtro en el alta de
  tiquets y edición desde Administración.
- El XLSX de catálogos separa equipo, categoría, subcategoría y problema en columnas propias; sigue
  leyendo el formato anterior con rutas.
- Las dependencias exigen al menos una ubicación; se editan juntas en el mismo formulario y en una
  sola hoja del XLSX.
- El equipo se asigna al problema (obligatorio) y el tiquet lo hereda; las categorías dejan de tener
  equipo. La migración reinicia tiquets y clasificación por ser una estructura todavía en definición.
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
- Compose: producción descarga las imágenes `:latest` de GHCR, deja `app` solo en la red `proxy` con
  el alias `axia` y ejecuta `migrate` antes de arrancar. El `.env` de producción solo pide los dos
  secretos; el desarrollo usa `.env.dev.example` y `compose.dev.yaml`. La guía cubre Nginx Proxy
  Manager y Cloudflare Tunnel. Se mantienen rotación de logs, cierre ordenado de PostgreSQL y
  hardening de `app`.

### Retirado

- Los envoltorios `deploy/scripts/up.sh`, `down.sh` y `migrate.sh`; `docker compose` cubre esos pasos.
- El runtime y las herramientas del stack anterior.
- La suite de pruebas ligada al esquema anterior; las invariantes se prueban contra PostgreSQL real.
- Las importaciones e integraciones externas quedan deshabilitadas en esta versión.

## [0.0.0] - 2026-10-21

Versión inicial en desarrollo.
