# Changelog

Todos los cambios relevantes se documentan en este archivo. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa versionado semántico.

## [Unreleased]

### Añadido

- El tablero de Métricas incorpora medidas robustas en **Tiempos**: mediana, P90, P95 y máximo,
  además de promedio y acumulado. La tarjeta **Distribución y atípicos** muestra la muestra y su
  cobertura, la mediana, el IQR, el P90, el máximo y el porcentaje fuera de la valla de 1.5×IQR
  por fase, y **Calidad** resume los atípicos del periodo. Las medidas robustas excluyen los
  tiquets sin la fase y se ocultan con menos de cinco casos.

### Cambiado

- El resumen de métricas acepta `stat` y `timeMode`; los campos fijos `p50*`/`p90*` se sustituyen
  por `stat*` y `n*`. Los percentiles dejan de mostrarse solo en reloj continuo.

## [0.24.0] - 2026-11-12

### Añadido

- La pausa sigue un flujo por motivo: los subestados se separan en pasos de avance y salidas, y
  la salida solo se habilita desde el paso actual. Se agregan el editor de flujo en administración,
  la hoja **Transiciones de pausa** en la importación/exportación y motivos base para diagnóstico,
  permisos, condiciones inseguras, documentación, equipo de acceso y traslado de personal. La
  interfaz oculta las acciones de avance y reanudación cuando no tienen opciones.

### Cambiado

- El catálogo de pausa ya no acepta cualquier descendiente de la raíz al reanudar. La semilla
  incluye dieciséis motivos con salidas directas y como máximo dos pasos de avance; el resto se
  configura desde el editor de flujo.

## [0.23.0] - 2026-11-11

### Cambiado

- La Bandeja permite tomar una oferta sin abrir el detalle, separa los tiquets sin asignar del
  trabajo en atención, evita repetir las ofertas en la cola del equipo y muestra antigüedad,
  conteos y estados de carga, error y vacío propios por sección.

### Añadido

- Dos temas nuevos: **Ámbar**, con primario naranja cálido, y **Rosa**, con primario rosa. Ambos
  incluyen modo claro y oscuro, fondos y bordes propios, colores semánticos y una paleta de
  gráficas ajustada para mantener la distinción entre series.

### Cambiado

- El Panel se reorganiza como bandeja accionable: las cifras se pueden pulsar para abrir su lista,
  las ofertas y el trabajo propio aparecen antes que la actividad y las métricas, y las bandejas
  se componen por capacidades para que una persona con varios roles vea todas sus tareas. La
  actividad reciente usa un tono por tipo de evento y las ofertas se limitan a cinco elementos.
- En el tema claro, el fondo de la aplicación se tiñe ligeramente y los bordes de las superficies
  ganan contraste. Las tarjetas de métricas y la franja de salud usan el mismo límite visible que
  el resto de tarjetas, sin añadir sombras generales.
- Se unificó el límite de tarjetas, tablas, listas y pastillas de estado. Las pestañas y segmentos
  activos usan el acento primario suave, igual que la navegación lateral, el selector de catálogos, la lista de roles y los calendarios;
  los accesos de administración heredan ese mismo acento.
- La pestaña Equipo conserva los tiempos y los alinea con el reloj activo en la participación de
  técnicos y el apoyo auxiliar. Los supervisores muestran tasa de toma, tasa de pendientes y
  retiradas, y el tiempo hasta la toma se identifica como continuo. Se añade un ranking de
  participación y búsqueda en el apoyo auxiliar.
- La pestaña Calidad se organiza en salud de calidad, dónde falla y motivos y salidas. El mapa de
  calor y el riesgo de retrabajo comparten dimensión; el riesgo permite elegir reapertura,
  recaptura o reasignación y se muestra como comparación de cada agrupación contra el promedio
  global. Se evita repetir el tiempo de duplicados, se añade la tasa de
  duplicados y los tiempos sin variante laboral se identifican como continuos.
- La pestaña Tiempos se organiza en ciclo, dimensiones y personas. El selector de agregación se
  mueve a la cabecera, el mapa de calor incluye fuera de atención y reclamación, y el reloj
  continuo/laboral/extra se aplica también a técnicos, solicitantes y totales por dimensión. Los
  percentiles se identifican como continuos.
- El Resumen muestra ocho indicadores —total de tiquets, tiquets activos, sin asignar, en pausa,
  cerrados, cumplimiento del SLA, satisfacción y primera resolución— y organiza el resto en un
  bento de seis tarjetas que se reacomoda sin huecos. El ciclo medio sale del Resumen y el detalle
  por estado se unifica con las familias del estado actual; la composición del ciclo queda en
  Tiempos y la tabla completa por estado en Distribución.

## [0.22.0] - 2026-11-10

### Añadido

- El tablero y el detalle de un tiquet muestran los tiempos en tres relojes: **Continuo** (24
  horas), **Laboral** (calendario del equipo) y **Extra** (fuera del horario laboral). Las fases,
  tablas y la barra del ciclo respetan el modo elegido; el SLA acepta `clock=calendar|laboral`.
- Nuevos indicadores: percentiles P50/P90 por fase, rangos de antigüedad, calidad del tiempo
  (hora sin verificar y alertas abiertas), tiempo hasta marcar un duplicado y horas de apoyo
  auxiliar por técnico y categoría.

### Cambiado

- El tablero de métricas se rediseñó como una sala de control: superficies planas, barra de
  herramientas fija, barra del ciclo en el resumen, pestañas de tiempos y calidad más claras y
  cifras tabulares de mayor jerarquía.

### Corregido

- Los tiempos laborales por técnico sujeto y por solicitante usan el calendario guardado en cada
  tramo, no el calendario actual del equipo. Cambiar el calendario de un equipo ya no altera el
  histórico de esos indicadores.

## [0.21.0] - 2026-11-10

### Añadido

- Se documentó la política de tiempo autoritativo de la instancia: hora en línea del servidor,
  confianza de la hora offline, alertas por desfase, corrección manual obligatoria, rechazo de
  valores negativos y fase `dormant`. Decisión en el
  [ADR 0125](docs/decisions/0125-tiempo-autoritativo-instancia.md).
- Se añadió `pnpm db:audit:time`, un reporte de solo lectura sobre cobertura de fases, duraciones
  negativas, desfase entre hora de acción y registro, pausas y alertas de tiempo.

### Cambiado

- La corrección manual de la hora de un evento ajusta también sus filas enlazadas (pausas, pasos,
  asignaciones, participaciones, validaciones, reclamaciones, ofertas y capturas), recalcula el
  cierre del tiquet y reconstruye los tramos. El ajuste no puede saltar entre ciclos ni mover el
  alta a otro año.
- El subestado de salida de una pausa se guarda como motivo de cierre y ya no reetiqueta el
  intervalo anterior.
- Los eventos, tramos y participaciones conservan el calendario y la clasificación de reloj con
  los que se registraron; reconstruir el histórico ya no relee los catálogos actuales.
- Los filtros por día y el volumen de métricas usan la zona horaria de la instancia. Los
  calendarios laborales admiten turnos que cruzan medianoche y rechazan solapamientos.
- Las medias de desempeño excluyen duplicados y tiquets con tiempo no verificado; el volumen y la
  distribución por desenlace los siguen contando. El resumen separa “Tiempo total (todos)” de
  “Resolución (cerrados)” y la antigüedad muestra todos los pendientes, sin limitarse al periodo.
- Reactivar un tiquet descartado restaura la pausa, la asignación del líder y su participación.
- El tiempo entre un desenlace y una reclamación o reactivación se mide como fase `dormant`
  (“Fuera de atención”) y queda fuera de los indicadores de desempeño.
- La evidencia conserva el ciclo en que se capturó aunque se suba tras una reapertura. La captura
  sin conexión mantiene su hora provisional con confianza y la lista marca “Hora sin verificar”
  cuando falta corregirla; las subidas en línea usan la hora del servidor.
- La migración de backfill repara duraciones y cierres demostrables y reconstruye los tramos del
  histórico, sin reescribir horas ni convertir alertas reales en tiempo confiable.

## [0.20.0] - 2026-11-09

### Añadido

- La lista de tiquets muestra ubicación, solicitante y técnico asignado, y la descripción incluye la
  categoría. Los filtros nuevos cubren equipo, prioridad, solicitante, técnico, dependencia, tipo de
  servicio, rango de fechas, tiquets sin ruteo y posibles duplicados.

### Cambiado

- Las pestañas de métricas comparten fila con el periodo y los filtros; el botón Exportar permanece
  en el encabezado.

## [0.19.0] - 2026-11-09

### Eliminado

- Se retiraron la página de administración de integraciones, la referencia histórica de plataformas
  externas, el verificador `check:agnostic` y las tablas genéricas `external_systems` y
  `ticket_external_refs`. El núcleo no depende de plataformas externas. Decisión en el
  [ADR 0124](docs/decisions/0124-retirada-referencias-externas.md).
- La actualización aplica la migración `0031_remove_external_refs.sql`. Si `external_systems` o
  `ticket_external_refs` conservan filas, la migración aborta y la app no arranca hasta exportarlas
  y vaciarlas.

## [0.18.0] - 2026-11-09

### Añadido

- Una cuenta que es solicitante y supervisora del mismo tiquet puede validar ambos lados en dos
  pasos, con `role` en la acción `validate`. El detalle expone el estado de cada lado y la interfaz
  muestra una acción por lado; la proyección offline conserva los dos pasos. Decisión en el
  [ADR 0123](docs/decisions/0123-validacion-dos-lados-misma-cuenta.md).

## [0.17.1] - 2026-11-09

### Corregido

- La gráfica «Riesgo de retrabajo» identifica cada categoría: el tooltip muestra el nombre y sus
  valores legibles, y el detalle bajo la gráfica lista tiquets, reapertura y trabajo activo de cada
  categoría.

## [0.17.0] - 2026-11-06

### Añadido

- Ciertos problemas pueden exigir un adjunto (PDF, JPEG, PNG, WebP, DOCX o XLSX) al registrar el
  tiquet. El archivo se guarda aparte de las evidencias, se verifica por contenido y se exige
  también al recapturar a un problema con regla. Decisión en el
  [ADR 0122](docs/decisions/0122-adjuntos-obligatorios-por-problema.md).

## [0.16.0] - 2026-11-06

### Añadido

- Bandeja y Mi trabajo ofrecen una vista de tablero de solo lectura con columnas por estado. Las
  tarjetas abren el detalle y las bandejas conservan su lista; no se arrastran ni cambian estados.
  Decisión en el [ADR 0121](docs/decisions/0121-tableros-bandeja.md).

## [0.15.0] - 2026-11-05

### Añadido

- Los avisos in-app cubren reasignación de supervisor y técnico, apoyo auxiliar, recaptura, cambio de
  prioridad, atendido pendiente de validación, validación, reclamación resuelta, reapertura,
  reactivación y calificación. Quien realiza una acción no recibe el aviso de esa misma acción.
  Decisión en el [ADR 0120](docs/decisions/0120-avisos-diversos-y-badges.md).
- La bandeja describe cada aviso con autor, motivo y contexto del tiquet, en lugar de mostrar solo el
  nombre del evento.
- Bandeja y Mi trabajo muestran un badge con ofertas pendientes y tiquets activos, respectivamente,
  mediante `GET /api/tickets/attention`.

## [0.14.1] - 2026-11-05

### Corregido

- La configuración de la instancia vuelve a poder guardarse en la build publicada: el React
  Compiler memoizaba los `ref` de React Hook Form y `reset` dejaba los campos sin registrar. El
  calendario y la prioridad por defecto también muestran el valor guardado cuando sus opciones
  llegan después del montaje. Decisión en el
  [ADR 0119](docs/decisions/0119-react-compiler-y-formularios.md).

## [0.14.0] - 2026-11-05

### Cambiado

- La detección de posibles duplicados acota la búsqueda al mismo edificio, ubicación y dependencia, en
  lugar de todo el edificio. La vista previa exige ubicación y dependencia, y el puntaje se reparte
  entre texto, problema y subcategoría. Decisión en el
  [ADR 0118](docs/decisions/0118-ambito-deteccion-duplicados.md). Las alertas existentes se pueden
  recalcular con `pnpm db:duplicates`.

## [0.13.0] - 2026-11-05

### Añadido

- Los catálogos, desplegables y listados de nombres ordenan los tramos numéricos como números:
  `Piso 2` queda antes que `Piso 10`. La regla es portable y no requiere ICU; decisión en el
  [ADR 0117](docs/decisions/0117-orden-natural-portable.md).

## [0.12.0] - 2026-11-04

### Añadido

- El ruteo de supervisor abre una ronda de ofertas por cada reasignación o recaptura y conserva las
  anteriores. Si no hay candidatos que puedan tomar, registra `unrouted`, avisa a administración y
  el detalle y la lista exponen `isUnrouted` a quien coordina (RN-03). Decisión en el
  [ADR 0115](docs/decisions/0115-rondas-de-oferta-y-sin-ruteo.md).
- El administrador puede reasignar tiquets `registered` sin ruteo para devolverlos a la cola de
  supervisores. La reasignación directa valida que el supervisor destino pueda continuar el tiquet.

### Corregido

- El detalle y las listas de tiquets avanzan de inmediato el estado de las acciones encoladas sin
  conexión y lo marcan como «Sin sincronizar». La proyección es solo de presentación, se detiene
  ante acciones ambiguas o errores y el servidor sigue siendo la autoridad. Decisión en el
  [ADR 0116](docs/decisions/0116-proyeccion-local-acciones-offline.md).
- Reasignar un tiquet a un equipo sin candidatos, o volver al equipo anterior en el mismo ciclo, ya
  no lo deja en `registered` sin ofertas ni bloquea la toma.
- Desactivar o eliminar una cuenta cierra sus asignaciones y ofertas abiertas; los tiquets sin
  trabajo iniciado vuelven a ruteo.

## [0.11.0] - 2026-11-04

### Añadido

- El tiempo por fase cubre todo el ciclo del tiquet con una única fase primaria abierta. Se añade
  `pending_take` para las esperas posteriores a una reasignación, la cobertura se verifica con
  `v_ticket_phase_coverage` y la interfaz deja de mostrar “Sin clasificar”. Decisión en el
  [ADR 0114](docs/decisions/0114-fases-exclusivas-y-desenlaces.md).
- Rechazados, cancelados y duplicados se miden como desenlaces propios, con filtro y dimensión
  `outcome`, tiempo hasta el desenlace y tarjeta de resumen. SLA, resolución y primera resolución
  solo cuentan cerrados; los duplicados quedan fuera de carga.

### Corregido

- La reconstrucción histórica cubre asignaciones directas sin toma, reactivaciones, reclamaciones
  desde cerrado y cierres cuyo `closed_at` es posterior al último evento.
- La tasa de reapertura usa como denominador los tiquets que alguna vez cerraron. Reanudar una
  pausa vuelve a aplicar la clasificación de reloj del motivo de reanudación.

## [0.10.0] - 2026-11-04

### Añadido

- La PWA puede abrirse sin red con la última sesión e identidad validadas, con caducidad de 7 días,
  y conserva los tiquets y catálogos ya cargados para consultarlos offline. La copia local se borra
  al cerrar sesión y ante un 401. Decisión en el
  [ADR 0113](docs/decisions/0113-arranque-lectura-offline.md).
- La cola offline reintenta cada 30 segundos mientras la pestaña está visible y hay conexión; el
  indicador de pendientes permite **Sincronizar ahora**.

## [0.9.0] - 2026-11-04

### Añadido

- La dependencia del solicitante acota el alta: solo se ofrecen los edificios con ubicaciones
  vinculadas a ella y esas ubicaciones; si no tiene dependencia, se mantiene el catálogo completo.
  La regla se valida en el servidor y también en la recaptura, que conserva las correcciones de
  texto de capturas históricas. El detalle expone la dependencia del solicitante y los catálogos
  aceptan `dependencyId`. Decisión en el
  [ADR 0112](docs/decisions/0112-dependencia-solicitante-acota-ubicaciones.md).

### Cambiado

- El alta muestra primero al solicitante; cuando tiene dependencia, la dependencia queda fija y los
  campos de edificio y ubicación se limitan a su ámbito.

## [0.8.1] - 2026-11-04

### Corregido

- Validar, calificar, reclamar o cancelar a nombre del solicitante exige elegirlo explícitamente en
  «Actuar a nombre de»; el permiso `*_on_behalf` ya no sustituye al solicitante por sí solo. Sin
  proxy, el supervisor valida su propio lado y la calificación queda reservada al solicitante. La
  migración 0022 reañade `ticket.open_claim_on_behalf` y `ticket.cancel_on_behalf`. Decisión en el
  [ADR 0111](docs/decisions/0111-proxy-explicito-solicitante.md).
- La reclamación y la cancelación sin proxy se atribuyen al actor, no al solicitante; con proxy
  conservan el sujeto solicitante. Las acciones offline conservan el sujeto elegido.

## [0.8.0] - 2026-11-03

### Cambiado

- La imagen `latest` es el canal por defecto; cada release publica `latest`, `vX.Y.Z` y el SHA.
  `AXIA_IMAGE` es opcional y permite fijar una versión o un digest.
- La app aplica las migraciones pendientes antes de arrancar y se retira el servicio `migrate`.
  La actualización vuelve a ser `docker compose pull` y `docker compose up -d --wait`. Decisión en
  el [ADR 0110](docs/decisions/0110-latest-y-migracion-en-arranque.md).

## [0.7.0] - 2026-11-03

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
