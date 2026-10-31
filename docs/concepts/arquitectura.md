# Arquitectura

Axia es una PWA autoalojable: un servidor Fastify sirve la API y el SPA, PostgreSQL conserva los
registros y un volumen privado conserva las evidencias. Una base corresponde a una instancia.
Las [reglas de negocio](negocio.md), el [modelo de datos](datos.md), los
[permisos](../reference/permisos.md) y la [API](../reference/api.md) son sus referencias canónicas.

## Componentes y límites

| Componente | Responsabilidad y criterio |
|---|---|
| `apps/web` | SPA/PWA con Vite, React y TypeScript; no necesita SSR ni SEO detrás del acceso |
| `apps/server` | Fastify 5: API, sesiones, autorización, acciones, archivos y tiempo real |
| PostgreSQL 17 | Datos, sesiones, bitácora, restricciones, tramos y avisos |
| Volumen de evidencias | Imágenes normalizadas y miniaturas; no es un directorio público |
| Compose | Base, migrador y app; una misma imagen de release para los dos últimos |

La web habla solo con `/api` del mismo origen. Los componentes usan `features/*/api`; cada feature
expone su `index.ts` a los demás. Router organiza rutas, Query coordina consultas y Zod valida la
frontera HTTP; los comandos discriminados conservan juntos la operación y sus argumentos tanto al
enviar como al encolar. No hay SDK generado ni paquete de contratos compartido: las pruebas de
frontera deben detectar divergencias entre servidor y cliente.

Tailwind y las primitivas de shadcn/ui comparten tokens semánticos y temas; Recharts utiliza el
componente `chart` para conservar esa integración. Los formularios usan React Hook Form y Zod.
Las primitivas vendorizadas tienen excepciones de estilo limitadas a `components/ui`; la lógica
propia mantiene los límites de las [convenciones](../reference/convenciones-codigo.md).
React Compiler se aplica al build; el desarrollo normal evita su coste en cada transformación.

No existe una plataforma externa necesaria ni una segunda fuente de verdad. Las referencias
externas son pares genéricos en `ticket_external_refs`; no incorporan reglas de otros sistemas.
No se publican adaptadores externos en esta versión. Si se añaden, serán aislados, opcionales y
por defecto de entrada; el flujo del núcleo seguirá completo aunque desaparezca su origen.

## Petición, sesión y autorización

1. La cookie opaca identifica una sesión; el servidor carga el actor y sus permisos actuales.
2. `can` y `canAct` evalúan capacidades y ámbito; actuar exige primero poder ver el tiquet.
3. Los repositorios aplican `scopePredicate` en SQL antes de leer o agregar resultados.
4. La acción bloquea el tiquet y valida estado, precondiciones e idempotencia en una transacción.
5. Los cambios y sus eventos se confirman juntos; el evento alimenta tramos y difusión SSE.

La autorización reside en el servidor, sin RLS ni consultas directas desde el navegador. Una vista
SQL no autoriza por sí misma. Lista, detalle, historial, evidencia, recuperación SSE y métricas
comparten alcance; las métricas intersectan los filtros antes de agregar, sin sumar concesiones
repetidas. Un tiquet invisible responde 404; la falta de permiso sobre uno visible, 403.
El historial del solicitante aplica además la visibilidad por tipo de evento, incluso si tiene
otros roles. Ocultar botones o rutas en la web solo orienta: no sustituye estas comprobaciones.

Las contraseñas locales se derivan con Argon2id. La cookie contiene un token aleatorio y la base
solo su hash SHA-256; es `HttpOnly`, `SameSite=Lax` y `Secure` en producción. Las sesiones tienen
vencimiento absoluto e inactividad, actualización de uso acotada y revocación. El acceso limita
intentos y verifica una contraseña ficticia para usuarios inexistentes. Las mutaciones con cookie
comprueban el origen público; no se guarda un token de autenticación en `localStorage`.
El primer administrador se crea bajo bloqueo cuando no hay cuentas. Los cambios de acceso
protegen la propia cuenta y el último administrador; cambiar roles exige `role.manage` también
en el servicio. El rol administrador conserva sus permisos protegidos.
Una sesión con `mustChangePassword` solo permite consultar identidad, cambiar la contraseña y
cerrar sesión hasta completar el cambio obligatorio.

Fastify sirve estáticos y API del mismo origen, sin CORS abierto. Las respuestas de error no
exponen detalles internos; la protección HTTP y el proxy de confianza forman parte del servidor.
Los secretos de base y sesión no llegan al cliente ni a los logs. Las opciones y límites exactos
se consultan en [configuración](../reference/configuracion.md).

## Persistencia, historial y tiempos

Las migraciones SQL de `apps/server/db/migrations/` son la única definición ejecutable del
esquema: tablas, restricciones, índices, vistas, funciones y disparadores. Drizzle ejecuta SQL
parametrizado y transacciones con tipos explícitos de resultado; no hay un esquema TypeScript
paralelo generado por introspección. Así no se pierden objetos que un modelo ORM no representa.
El rol migrador puede hacer DDL; `axia_app` tiene permisos limitados y no modifica la bitácora.

Cada archivo nuevo se aplica bajo advisory lock y, normalmente, en su propia transacción. Los
SQL ya integrados no se editan. El runner verifica hashes y archivos del historial; la adopción
única de un historial antiguo sin hashes no prueba que sus SQL jamás cambiaran. La excepción
`axia:no-transaction` exige una sola sentencia idempotente para operaciones incompatibles con
transacciones; se registra únicamente al terminar. Una retirada no puede borrar datos por
sorpresa: la [decisión 0101](../decisions/0101-retirada-historica.md) detalla bloqueo, comprobación
y rollback ante tablas ocupadas o dependencias inesperadas.

`ticket_events` es una bitácora de solo agregar. El estado solo cambia mediante acciones del
servidor; los bloqueos y claves únicas resuelven concurrencia e idempotencia. El UUID interno,
el número generado por secuencia y el folio legible son distintos; número y folio son inmutables.
Solicitantes y técnicos son catálogos con cuenta opcional: las acciones por proxy conservan
actor y sujeto por separado, y los contactos del tiquet se guardan como instantánea.
La detección aproximada de duplicados usa `pg_trgm`, sin añadir un motor de búsqueda externo.

Los motivos viven en un catálogo jerárquico por uso, con nota, fecha estimada y clasificación de
reloj. Evita codificar un estado por cada causa operativa. Una restricción permite una sola pausa
abierta; motivo y pasos se conservan separados para medir el tiempo por subestado.

Los `time_spans` se derivan de eventos, no de cifras de duración editables. Al abrir un tramo se
copia `clock_class`: cambiar después el catálogo no reclasifica ese tramo. La hora funcional
`occurred_at` se distingue de `recorded_at`, que siempre registra el servidor. Las correcciones
horarias dejan auditoría, respetan los eventos vecinos y reconstruyen los tramos; no se crean
tramos manuales independientes. Los requisitos de proxy y captura horaria están en
[permisos](../reference/permisos.md) y [API](../reference/api.md).

Las fechas son `timestamptz`; la presentación usa la zona de la instancia. El cálculo laboral
cruza tramos con franjas y festivos en la zona del calendario del equipo, con respaldo de la
instancia. Mide cobertura del equipo, sin turnos ni asistencia individual; las franjas se definen
sin solapamientos y las nocturnas se dividen por día. Sin calendario activo el cálculo es continuo;
un calendario activo sin franjas produce cero laboral. El trabajo fuera de cobertura sigue
registrado como diferencia entre calendario y laboral. La base calcula tiempos; las consultas
agregadas del servidor evitan descargar todo el historial al navegador.

## Evidencias

La creación valida tipo, estado y acceso real al tiquet, y registra `evidence_added` junto con la
fila `pending` en una transacción. TUS permite reanudar subidas: cada petición autentica al usuario
y comprueba la propiedad de la evidencia; no permite borrarla por ese protocolo.
Sharp admite JPEG, PNG y WebP, corrige orientación, limita dimensiones, normaliza a WebP y genera
miniatura sin conservar EXIF. Se comprueban límites y cuota antes de aceptar y al procesar.
Solo evidencia `ready` satisface las precondiciones de una acción.

PostgreSQL guarda metadatos, estado y rutas relativas; los archivos viven fuera de la base para
simplificar su entrega y evitar blobs en las consultas. Archivo y miniatura pasan por rutas
con sesión y alcance del tiquet: conocer el UUID no concede acceso. La limpieza de cargas
huérfanas y la retención son tareas operativas, no borrados de la bitácora.
Base y volumen no tienen transacción distribuida; sus respaldos requieren coordinación.

## Tiempo real y recuperación

Un disparador publica identificadores y tipo de evento mediante `LISTEN/NOTIFY`, sin enviar el
contenido completo. Una conexión PostgreSQL dedicada, fuera del pool de peticiones, escucha y
reconecta. El puente serializa la difusión y agrupa pestañas por actor para acotar consultas.
Cada actor recibe solo eventos visibles por ámbito y por las reglas del solicitante.

SSE invalida consultas; no reemplaza la lectura autorizada. El cliente reconecta y consulta los
cambios posteriores al último ID mediante `/api/events/changes`, con los mismos filtros. El
stream envía heartbeat y desactiva el buffering del proxy. Logout, revocación, cambio de acceso
y vencimiento cierran las conexiones afectadas; al reconectar se carga el actor vigente.
La bandeja contiene avisos del actor sobre tiquets visibles. Web Push y escalamiento automático
siguen [pendientes](../guides/notificaciones.md); no se presentan como servicios activos.

## Trabajo sin conexión

Dexie guarda en IndexedDB acciones y fotos con propietario y UUID del cliente. Permite conservar
blobs y trabajo pendiente; la sincronización se dispara al abrir, recuperar red y volver al
primer plano, sin depender del Background Sync del navegador.

La cola une evidencia y acciones por ID de tiquet. Un error o envío anterior bloquea sus pasos
posteriores incluso entre procesamientos; los otros tiquets avanzan. Las filas antiguas sin clave
se resuelven con su manejador. Un error definitivo exige reintentar o descartar expresamente.
Se procesa solo el propietario autenticado y se interrumpe el resto al cambiar de usuario.
La serialización es de la pestaña actual: no coordina varias pestañas y necesita idempotencia
en el servidor. Subir una foto y ejecutar una acción no constituye una transacción conjunta.

La sincronización reutiliza `runTicketAction`: revalida permisos, estado y hora funcional; no
confía en el estado local. Cada resultado distingue aplicado, duplicado, rechazo, conflicto o
bloqueo. El reenvío conserva el UUID; una clave usada para otra acción se rechaza. Los conflictos
no sobrescriben el estado vigente ni se descartan silenciosamente.

## Entornos y operación

Desarrollo ejecuta watchers en el host y PostgreSQL propio; pruebas usa datos desechables y bases
separadas para integración y navegador. Las guardas impiden resets contra otros destinos. Las
migraciones aportan referencia necesaria; la demo ficticia requiere activación local explícita.
Vitest prueba reglas puras y PostgreSQL real para permisos, transacciones y concurrencia;
Playwright verifica flujos de la PWA. Un mock de base no sustituye esas garantías.

La release contiene una imagen compartida por app y migrador, con credenciales separadas y digest
fijado en el paquete. La app solo es accesible tras el proxy elegido por el operador. El respaldo
coordinado detiene escrituras; la restauración exige destino vacío y conserva la app detenida si
falla. Procedimientos en [instalación](../../deploy/README.md), [operación](../guides/operacion.md)
y [desarrollo](../start/desarrollo.md); justificación operativa en
[0099](../decisions/0099-consolidacion-self-hosted.md).

El pool de peticiones está limitado a diez conexiones. No se añaden PgBouncer, particiones ni
índices indiscriminados: se justifican con consultas y medición del
[rendimiento](../reference/rendimiento-postgres.md). Los originales de decisiones consolidadas
siguen disponibles en el [historial Git](../history/README.md).
