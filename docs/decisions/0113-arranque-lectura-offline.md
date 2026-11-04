# 0113 — Arranque y lectura offline con caché de 7 días

**Fecha:** 2026-11-04
**Estado:** aceptada

## Decisión

La PWA conserva en el dispositivo la **última sesión validada** y su identidad para poder abrirse
sin red. La copia caduca a los **7 días**, se borra al cerrar sesión y ante un 401, y se marca en la
interfaz como «Sesión sin conexión». El servidor sigue siendo la autoridad: al recuperar la red se
revalida `/api/auth/me` y cada sincronización vuelve a comprobar permisos, estado y reglas.

Las consultas de React Query se persisten en Dexie con el mismo plazo de 7 días. Solo se guardan
tiquets, catálogos e identidad; quedan fuera notificaciones, métricas, administración y URLs de
evidencia. El caché se marca con el usuario dueño y se descarta si el dueño falta o no coincide con
la sesión vigente. El service worker continúa cacheando únicamente el shell de la aplicación: no se
cachean respuestas `/api`, para evitar datos de una sesión anterior y no depender de una caché HTTP
opaca.

La cola offline reintenta cada 30 segundos mientras la pestaña está visible y hay conexión. El
indicador de pendientes permite **Sincronizar ahora**. Se mantienen los disparadores existentes
(apertura, evento `online` y vuelta a primer plano) y no se usa Background Sync.

El alta de tiquets sigue requiriendo conexión. Es una decisión explícita: un borrador local necesita
folio provisional, mapeo de ID local a servidor, resolución de evidencias y acciones, y una política
para duplicados y hora de captura. Se abordará en una fase separada.

## Alternativas y consecuencias

Se descartó cachear `/api/auth/me` o las respuestas de API en el service worker: la caché HTTP no se
limpia por usuario, es difícil de invalidar y puede mezclar datos entre sesiones en un dispositivo
compartido.

Se descartó una copia explícita de cada tiquet en Dexie: el persister oficial de TanStack Query cubre
listas, detalles y catálogos con menos código y respeta la invalidación normal.

El coste es que los datos quedan en el dispositivo y quien lo tenga desbloqueado puede consultarlos
sin red. La caducidad, el borrado al cerrar sesión/401 y el filtro de consultas acotan la exposición;
no sustituyen una protección local por PIN, que no forma parte de esta decisión. Si la persona no
valida la sesión en línea durante 7 días, deberá iniciar sesión de nuevo; los pendientes de la cola
siguen en el dispositivo y se envían cuando vuelva la conexión.
