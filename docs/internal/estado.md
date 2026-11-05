# Axia — Estado del proyecto

Memoria de continuidad. Historial en [CHANGELOG](../../CHANGELOG.md), razones técnicas en
[arquitectura](../concepts/arquitectura.md) y [ADR](../decisions/README.md).

**Última actualización:** 2026-11-05

## Tarea integrada: configuración guardable en la build

- El botón Guardar de `/admin/configuracion` permanecía deshabilitado en la build publicada porque
  React Compiler memoiza los `ref` de React Hook Form y `reset` vaciaba el registro de campos.
  Ahora el formulario se remonta cuando cambian los ajustes guardados y no usa `reset`.
- El calendario y la prioridad por defecto remontan el `<select>` cuando sus opciones están
  disponibles, para mostrar el valor guardado y no confundirlo con “Selecciona…”.
- Decisión en el [ADR 0119](../decisions/0119-react-compiler-y-formularios.md). Se añadió
  `pnpm test:compiler`, que corre las pruebas del formulario con `AXIA_REACT_COMPILER=1` y forma
  parte de `pnpm check`.
- Integrada a `main` por fast-forward en `a5d59d4`.

### Evidencia de esta tarea

- `pnpm check:fast`: 64 pruebas de servidor y 412 de web en verde.
- `pnpm test:compiler`: 2/2 en verde.
- `pnpm check`: código 0; 64 unitarias de servidor, 412 de web, 363 de PostgreSQL (52 archivos),
  60 de navegador y build. Persiste el aviso de chunks >500 kB.
- Verificación manual de la build compilada servida con `vite preview`: calendario y prioridad
  muestran el UUID del servidor; texto, desplegables y checkboxes habilitan Guardar; revertir los
  deshabilita; guardar limpia el estado; editar después de guardar vuelve a habilitar; recargar
  conserva los valores.

## v0.14.0 publicada

- Etiqueta `v0.14.0` creada desde `main` en `129dd45`. Workflow
  [42086494519](https://github.com/MarcosAvg/axia/actions/runs/42086494519): `verify / check`,
  `verify / docker` y `publish` terminaron en `success`.
- Imagen pública `ghcr.io/marcosavg/axia/axia-app:v0.14.0`,
  `ghcr.io/marcosavg/axia/axia-app:latest` y
  `ghcr.io/marcosavg/axia/axia-app:129dd456e05f892ef8c51fbf154f4951fe26ac6a`, digest
  `sha256:c8f48c59c54b8ea95d55faffecc461d7f0d03988ef102ac87e5c844024a4558b`.
- [Release v0.14.0](https://github.com/MarcosAvg/axia/releases/tag/v0.14.0) con
  `axia-self-hosted.tar.gz` (SHA-256 `c4f384f63426e789f7ed5f9522fa993d8199eb9fdc4734e7098bf9e3a2d08392`)
  y su `.sha256`.
- Incluye el ámbito de detección de duplicados por edificio, ubicación y dependencia (ADR 0118).

## Tarea integrada: ámbito de detección de duplicados

- La detección acota los candidatos al mismo edificio, ubicación y dependencia; la vista previa exige
  `locationId` y `dependencyId` y responde `400` si faltan.
- El puntaje se reparte en `0.50` texto, `0.40` problema y `0.10` subcategoría; los motivos quedan en
  `problem` y `subcategory`. Los tiquets con ubicación o dependencia nula no son candidatos.
- Decisión en el [ADR 0118](../decisions/0118-ambito-deteccion-duplicados.md); RN-29, la API y la
  guía de administración quedaron actualizadas. Las alertas abiertas se recalculan con
  `pnpm db:duplicates`.
- Integrada a `main` por fast-forward en `840c564`. Publicada en `v0.14.0`; la etiqueta, imagen y
  release se detallan arriba.

### Evidencia de esta tarea

- `pnpm check:fast`: lint y tipos en verde; 64 pruebas de servidor y 410 de web.
- `pnpm test:affected`: 284 pruebas de servidor y 32 de web.
- `pnpm check:static`: documentación, agnóstico, fronteras y knip en verde.
- `CI=1 pnpm check`: código 0; 64 + 410 unitarias, 363 de PostgreSQL (52 archivos), 60 de navegador
  (2 reintentos) y build. Persiste el aviso de chunks >500 kB.

## v0.13.0 publicada

- Etiqueta `v0.13.0` creada desde `main` en `2db9f57`. Workflow
  [42074510998](https://github.com/MarcosAvg/axia/actions/runs/42074510998): `verify / check`,
  `verify / docker` y `publish` terminaron en `success`.
- Imagen pública `ghcr.io/marcosavg/axia/axia-app:v0.13.0`,
  `ghcr.io/marcosavg/axia/axia-app:latest` y
  `ghcr.io/marcosavg/axia/axia-app:2db9f574e5c88a2516092c7a71494603a122cdc3`, digest
  `sha256:9aaae5381797014c5768fb539d780aa21f68dc0253e88194433dcbd97c73d5aa`.
- [Release v0.13.0](https://github.com/MarcosAvg/axia/releases/tag/v0.13.0) con
  `axia-self-hosted.tar.gz` (SHA-256 `425b67f63ca97f84cfb0d9eaa13c723b74fdb6cacaf2b9aa57a501465dac4a58`)
  y su `.sha256`.
- Incluye el orden natural de nombres (migración 0028 y ADR 0117).

## Tarea integrada: orden natural de nombres

- Los catálogos, desplegables y listados de nombres usan `public.natural_sort_key(...)` para que
  `Piso 2` quede antes que `Piso 10`. La función es portable, conserva la colación actual, no
  depende de ICU y deja los nulos al final.
- La migración 0028 crea la función y concede su ejecución a `axia_app`. Las columnas no textuales
  del admin conservan su orden nativo y prioridades/motivos mantienen `position` como criterio
  principal.
- Decisión en el [ADR 0117](../decisions/0117-orden-natural-portable.md).
- Integrada a `main` por fast-forward en `2db9f57` y publicada en `v0.13.0`.

### Evidencia de esta tarea

- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; lint, tipos, estáticos y knip; 64 pruebas de
  servidor, 410 de web, 360 de PostgreSQL (52 archivos), 60 de navegador y build. Persiste el aviso
  previo de chunks >500 kB.
- `pnpm test:e2e:smoke`: 19/19 en verde.
- Pruebas nuevas: orden natural de la función y sus casos límite, de `/api/catalogs/locations`
  (incluida la rama con dependencia) y de la API del admin.

## v0.12.0 publicada

- Etiqueta `v0.12.0` creada desde `main` en `b813226`. Workflow
  [41926909496](https://github.com/MarcosAvg/axia/actions/runs/41926909496): `verify / check`,
  `verify / docker` y `publish` terminaron en `success`. La CI de `main`
  ([41926902427](https://github.com/MarcosAvg/axia/actions/runs/41926902427)) también terminó en
  `success`.
- Imagen pública `ghcr.io/marcosavg/axia/axia-app:v0.12.0`,
  `ghcr.io/marcosavg/axia/axia-app:latest` y
  `ghcr.io/marcosavg/axia/axia-app:b813226e88dd040a54158b8424a1c42dc04e0581`, digest
  `sha256:777301c6b43f71db09533b8fbc0d8857d116347195735815210fd79048fe3f7f`.
- [Release v0.12.0](https://github.com/MarcosAvg/axia/releases/tag/v0.12.0) con
  `axia-self-hosted.tar.gz` (SHA-256 `a0f59d8e8359c3992fa3d023cb7d7ef5b166fbc843688423fdacd73401334df4`)
  y su `.sha256`.
- Incluye el ruteo de supervisor sin limbo (migraciones 0026 y 0027) y la proyección local de
  acciones offline (ADR 0116). Al actualizar una instancia se aplican las migraciones al arrancar.
- Evidencia local: `AXIA_ENV_FILE=/dev/null pnpm check` en código 0 con 64 pruebas de servidor, 410
  de web, 351 de PostgreSQL, 60 de navegador y build; `pnpm test:e2e:smoke` 19/19.

## Tarea integrada: proyección de acciones offline

- El detalle y las listas proyectan el estado de las acciones que siguen en la cola de Dexie. El
  técnico ve «En proceso» y las acciones siguientes sin esperar a recuperar la red; una insignia
  «Sin sincronizar» y un aviso enumeran los cambios pendientes.
- La proyección es solo de presentación: se calcula en orden de `seq`, cubre transiciones
  deterministas y se detiene ante acciones ambiguas, comandos inválidos o errores de la cola. El
  servidor sigue siendo la autoridad y la sincronización corrige cualquier divergencia.
- Se actualizaron el detalle, las listas, el resumen y el E2E offline. Los ayudantes E2E de acciones
  esperan ahora la respuesta de la acción concreta, no cualquier `POST`, y la aserción de estado se
  limita al encabezado.
- Decisión en el [ADR 0116](../decisions/0116-proyeccion-local-acciones-offline.md). Sin migración
  de base de datos.
- Integrada a `main` por fast-forward en `2fb5f77`.
- Publicada en `v0.12.0`; la etiqueta, imagen y release se detallan arriba.

### Evidencia de esta tarea

- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; lint, tipos, estáticos y knip; 64 pruebas de
  servidor, 410 de web, 351 de PostgreSQL, 60 de navegador y build. Persiste el aviso previo de
  chunks >500 kB.
- `pnpm check:fast`: código 0; 64 pruebas de servidor y 410 de web.
- `pnpm test:e2e:smoke`: 19/19 en verde.
- `pnpm check:docs`: 51 archivos, 0 enlaces rotos. `pnpm check:agnostic`: 874 archivos, 0
  coincidencias; fronteras y knip en verde.
- Pruebas nuevas: proyección de dominio, hook de cola, lista, `PendingActions` y el flujo E2E de
  inicio sin conexión con estado proyectado en detalle y lista.

## Tarea integrada: ruteo de supervisor sin limbo

- Cada ruteo abre una ronda de ofertas (`ticket_offers.offer_round`) y conserva las anteriores; volver
  al equipo previo en el mismo ciclo ya no deja el tiquet sin ofertas. `take` consume solo la oferta
  del ciclo vigente.
- `routeTicket` informa cuántas ofertas creó. Sin candidatos escribe `unrouted`, avisa a
  administración y la lista/detalle exponen `isUnrouted` a quien coordina. Solo se oferta a
  supervisores activos con ámbito, `ticket.view` y `ticket.take_offer`.
- El administrador puede reasignar desde `registered`; la reasignación directa exige que el destino
  pueda ver y continuar el tiquet.
- Desactivar o archivar una cuenta cierra sus asignaciones y ofertas abiertas; los tiquets sin
  trabajo iniciado vuelven a ruteo.
- Decisiones en el [ADR 0115](../decisions/0115-rondas-de-oferta-y-sin-ruteo.md).

### Evidencia de esta tarea

- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; lint, tipos, estáticos y knip; 64 pruebas de
  servidor, 388 de web, 60 de navegador, 351 de PostgreSQL y build. Persiste el aviso previo de
  chunks >500 kB.
- `pnpm test:affected`: 51 archivos de PostgreSQL en verde; el smoke de navegador falló una vez por
  un timeout de navegación y el caso dirigido pasó al reintentarse. La compuerta completa también
  falló una vez en un timeout de navegación y pasó en el siguiente intento.
- Documentación: 50 archivos, 0 enlaces rotos. `pnpm check:agnostic`: 864 archivos, 0
  coincidencias; fronteras y knip en verde.
- Migraciones 0026 (rondas y evento `unrouted`) y 0027 (regla de notificación). La migración es
  compatible con ofertas existentes: reciben `offer_round = 1`.
- Pruebas nuevas: `tickets-routing-http` (equipo sin candidatos, visibilidad, reoferta al mismo
  supervisor, destino sin permisos, recaptura y desactivación) y `actions-admin`.
- Integrada a `main` por fast-forward en `4575393`. Publicada en `v0.12.0`; la etiqueta, imagen y
  release se detallan arriba.

## v0.11.0 publicada

- Etiqueta `v0.11.0` creada desde `main` en `2869c5f`. Workflow
  [41890688737](https://github.com/MarcosAvg/axia/actions/runs/41890688737): verificación y
  publicación terminaron en `success`.
- Imagen pública `ghcr.io/marcosavg/axia/axia-app:v0.11.0`,
  `ghcr.io/marcosavg/axia/axia-app:latest` y
  `ghcr.io/marcosavg/axia/axia-app:2869c5fa8ad1d6f22a102ea2b2e14b051b5f2f3c`, digest
  `sha256:29375bbf1ef94f1536750dfbcac34be276a828581217c21f035005df746da4b1`.
- [Release v0.11.0](https://github.com/MarcosAvg/axia/releases/tag/v0.11.0) con
  `axia-self-hosted.tar.gz` (SHA-256 `33f2580d74a8850808b0d9be271596b40c1fb5e4beee34556307a058ca1c073c`)
  y su `.sha256`.

### Evidencia de esta tarea

- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; lint, tipos, estáticos y knip; 64 pruebas de
  servidor, 387 de web, 60 de navegador, 344 de PostgreSQL y build. Persiste el aviso previo de
  chunks >500 kB.
- `pnpm test:e2e:smoke`: 19 pruebas `@smoke` en verde.
- `pnpm check:docs`: 49 archivos, 0 enlaces rotos; `pnpm check:agnostic`: 853 archivos, 0
  coincidencias.
- Migraciones 0023 (fase `pending_take`), 0024 (fase primaria, cobertura y reconstrucción) y 0025
  (base de métricas con `outcome` y SLA solo para cerrados).
- La revisión final corrigió asignación directa sin toma, huecos de reactivación y reclamación desde
  cerrado, extensión al `closed_at` posterior al último evento, clasificación de pausa al reanudar y
  la composición de la barra: `pending_take` entra y `reassignment` queda fuera.
- El despliegue de instancias queda a cargo del operador.

## v0.10.0 publicada

- Etiqueta `v0.10.0` creada desde `main` en `c63d11e`. Workflow
  [41876557656](https://github.com/MarcosAvg/axia/actions/runs/41876557656): `verify/check`,
  `verify/docker` y `publish` terminaron en `success`; la API del run puede mostrar un estado
  retrasado, pero el artefacto y la release están verificados abajo.
- Imagen pública `ghcr.io/marcosavg/axia/axia-app:v0.10.0`,
  `ghcr.io/marcosavg/axia/axia-app:latest` y
  `ghcr.io/marcosavg/axia/axia-app:c63d11e594c970aa1d9f6ad2c474f87d2a3f13f4`, digest
  `sha256:ce494c3d14259daaea8ae116c1bc721c8b48a074b704863308d9e68c837a0e7d`.
- [Release v0.10.0](https://github.com/MarcosAvg/axia/releases/tag/v0.10.0) con
  `axia-self-hosted.tar.gz` (SHA-256 `c2a69691ca2bc49873f6b3e2b98d0a802b1f6c0b82b23779f66f7e4369095b1c`)
  y su `.sha256`.
- La verificación del tag ejecutó la compuerta completa, incluido el build y las 60 pruebas de
  navegador.

## Tarea integrada: arranque y lectura offline

- La última sesión validada y su identidad se guardan en el dispositivo con caducidad de 7 días;
  permiten abrir la PWA sin red y se borran al cerrar sesión/401.
- El caché de React Query se persiste en Dexie con el persister oficial y el mismo plazo; solo
  incluye tiquets, catálogos e identidad. Se marca con el usuario dueño y se descarta si falta o no
  coincide.
- La cola reintenta cada 30 segundos mientras la pestaña está visible/en línea y el indicador
  permite “Sincronizar ahora”.
- El cambio de contraseña limpia la identidad cacheada para no volver a la pantalla de cambio.
- El alta de tiquets sigue requiriendo conexión; se deja para una fase separada.
- Decisión en el [ADR 0113](../decisions/0113-arranque-lectura-offline.md).

### Evidencia de esta tarea

- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; lint, tipos, estáticos y knip; 64 pruebas de
  servidor, 385 de web, 327 de PostgreSQL, 60 de navegador y build. Persiste el aviso previo de
  chunks >500 kB.
- `AXIA_ENV_FILE=/dev/null pnpm check:docs`: 47 archivos, 0 enlaces rotos.
- `AXIA_ENV_FILE=/dev/null pnpm check:agnostic`: 844 archivos, 0 coincidencias.
- Sin migración de esquema: el cambio es de cliente.
- Integrada a `main` por fast-forward y publicada como `v0.10.0`; el despliegue de instancias queda
  a cargo del operador.

## v0.9.0 publicada

- Etiqueta `v0.9.0` creada desde `main` en `46dacce`. Workflow
  [41860346525](https://github.com/MarcosAvg/axia/actions/runs/41860346525): `verify/check` y
  `verify/docker` en `success`; los pasos de `publish` completaron en `success` y crearon la
  release. La API del run conserva `in_progress` por un retraso de GitHub, pero el artefacto y la
  release están verificados abajo.
- Imagen pública `ghcr.io/marcosavg/axia/axia-app:v0.9.0`,
  `ghcr.io/marcosavg/axia/axia-app:latest` y
  `ghcr.io/marcosavg/axia/axia-app:46dacce5432a5f318e84e8bcd4c9751ab7e0d79a`, digest
  `sha256:d5574f5c127e094636ee2550c7f287b45ba745e69e54316e4f8150cad761080c`.
- [Release v0.9.0](https://github.com/MarcosAvg/axia/releases/tag/v0.9.0) con
  `axia-self-hosted.tar.gz` (SHA-256 `114c292394afe37a209f22159b9238d6c9acd0abd7416d70e4629ab89aa19545`)
  y su `.sha256`.
- La imagen contiene la compuerta completa: 64 pruebas de servidor, 364 de web, 327 de PostgreSQL y
  60 de navegador.

## Tarea integrada: dependencia del solicitante acota ubicaciones

- El solicitante efectivo (propio o elegido a nombre de otro) fija la dependencia del alta. Si no
  tiene dependencia, se conserva el flujo anterior sin restricción.
- `GET /api/catalogs/buildings?dependencyId=…` y
  `GET /api/catalogs/locations?buildingId=…&dependencyId=…` filtran por los vínculos de
  `dependency_locations`.
- El alta rechaza una dependencia distinta a la del solicitante y una ubicación fuera de ella. La
  recaptura usa la dependencia del solicitante del tiquet y solo valida al cambiar el lugar.
- El detalle expone `requesterDependencyId` y `requesterDependencyName`; el catálogo de solicitantes
  incluye `dependencyName`.
- La validación de recaptura se separó a `recapture-validation.ts` para respetar el límite de
  líneas del archivo de alta. La revisión final corrigió la validación del par
  dependencia–ubicación para no ejecutarla cuando el lugar no cambia y añadió cobertura del
  filtrado y del reinicio al cambiar de solicitante.
- Decisión en el [ADR 0112](../decisions/0112-dependencia-solicitante-acota-ubicaciones.md).

### Evidencia de esta tarea

- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; lint, tipos, estáticos y knip; 64 pruebas de
  servidor, 364 de web, 327 de PostgreSQL, 60 de navegador (incluye los `@smoke`) y build.
  Persiste el aviso previo de chunks >500 kB.
- `AXIA_ENV_FILE=/dev/null pnpm check:docs`: 46 archivos, 0 enlaces rotos.
- `AXIA_ENV_FILE=/dev/null pnpm check:agnostic`: 834 archivos, 0 coincidencias.
- Sin migración de esquema: no cambia la base de datos.
- Integrada a `main` por fast-forward y publicada como `v0.9.0`; el despliegue de instancias queda
  a cargo del operador.

## v0.8.1 publicada

- Etiqueta `v0.8.1` creada desde `main` en `a87a041`. [Flujo 41847524513](https://github.com/MarcosAvg/axia/actions/runs/41847524513)
  (verify, docker y publish) y [CI 41847513058](https://github.com/MarcosAvg/axia/actions/runs/41847513058)
  terminaron en `success`.
- Imagen pública `ghcr.io/marcosavg/axia/axia-app:v0.8.1`,
  `ghcr.io/marcosavg/axia/axia-app:latest` y
  `ghcr.io/marcosavg/axia/axia-app:a87a041`, digest
  `sha256:79eb1c5aa627fa7862037013d5331d30f3cfc89e97357216edcb6cc7ecbc0812`.
- [Release v0.8.1](https://github.com/MarcosAvg/axia/releases/tag/v0.8.1) con
  `axia-self-hosted.tar.gz` (SHA-256 `aec5cd89dcc11f3bd96fd74afe807b4d46db0813716ac3be86c25abb75b27936`)
  y su `.sha256`. Actualizar la instancia aplica la migración 0022 al arrancar.
- Las acciones offline encoladas antes del cambio se interpretan como propias; una validación sin
  sujeto puede responder 409 si falta el lado del solicitante.

## Tarea publicada: proxy explícito del solicitante

- Validar, calificar, reclamar y cancelar a nombre del solicitante exige `subjectRequesterId` y el
  permiso `*_on_behalf` correspondiente. Sin proxy la acción es propia: la validación registra el
  lado del supervisor (y en `both` espera al solicitante), la calificación queda reservada al
  solicitante y la reclamación/cancelación se atribuyen al actor.
- Selector único «Actuar a nombre de» con «Nadie», el solicitante y los técnicos participantes. La
  interfaz explica el lado pendiente y comparte el sujeto con la calificación.
- Migración 0022 reañade `ticket.open_claim_on_behalf` y `ticket.cancel_on_behalf`; el detalle
  expone `requesterId` y `validationPolicy`. Decisión en el
  [ADR 0111](../decisions/0111-proxy-explicito-solicitante.md).

### Evidencia de esta tarea

- `AXIA_ENV_FILE=/dev/null pnpm check:fast`: código 0; lint, tipos, 64 pruebas de servidor y 354 de
  web.
- `pnpm db:test`: 46 archivos, 320/320.
- `AXIA_ENV_FILE=/dev/null pnpm test:e2e:smoke`: 18/18, incluida la validación proxy en dos pasos.
- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; estáticos y knip, 64 + 354 unitarias, 320 de
  PostgreSQL, 59 de navegador y build. Persiste el aviso previo de chunks >500 kB.
- Documentación: 45 archivos, 0 enlaces rotos. `pnpm check:agnostic`: 828 archivos, 0
  coincidencias; fronteras y knip en verde.
- La matriz `ui-quality` corta el SSE durante sus navegaciones: el servidor de desarrollo acumulaba
  conexiones y bloqueaba rutas tardías. La aserción de desbordamiento no cambia.
- Integrada a `main` y publicada como `v0.8.1`; evidencia en la sección superior.

## v0.8.0 publicada

- Etiqueta `v0.8.0` creada desde `main` en `7e8a299254ff39398dc445feaf78e7c5501d66e8`.
  [Flujo 41691240576](https://github.com/MarcosAvg/axia/actions/runs/41691240576) y
  [CI 41691240489](https://github.com/MarcosAvg/axia/actions/runs/41691240489) terminaron en
  `success`.
- Imagen pública `ghcr.io/marcosavg/axia/axia-app:v0.8.0`,
  `ghcr.io/marcosavg/axia/axia-app:latest` y
  `ghcr.io/marcosavg/axia/axia-app:7e8a299254ff39398dc445feaf78e7c5501d66e8`, digest
  `sha256:e04a6678ef63788e06307f048fb4e9a421190e0b5b98a2e5a7e1caa9f50eeec1`.
- [Release v0.8.0](https://github.com/MarcosAvg/axia/releases/tag/v0.8.0) con
  `axia-self-hosted.tar.gz` (SHA-256 `cd92fb4f31be14c40cc6c22d9d3403ae95166059c7a06e9c308e5268f54116d8`)
  y su `.sha256`; `release.json` fija el digest anterior y `.env.example` usa `latest` por
  defecto, con el digest comentado para fijar la release.
- La rama `feat/despliegue-latest-y-migracion-integrada` se integró por fast-forward y se retiró
  del checkout local.

## Tarea completada en rama: despliegue `latest` y migración integrada

- `latest` es el valor por defecto de `AXIA_IMAGE`; el workflow publica `latest`, `vX.Y.Z` y el
  SHA en cada release. El paquete deja `AXIA_IMAGE` comentado y `release.json` conserva el digest.
- Se retiró el servicio `migrate`: la app ejecuta `dist/db/migrate.js` antes de
  `dist/server.js` y elimina `MIGRATION_DATABASE_URL`/`AXIA_APP_PASSWORD` del proceso servidor.
- El healthcheck usa `start_period: 120s` para cubrir migraciones largas. La actualización es
  `docker compose pull` y `docker compose up -d --wait`.
- Decisión en el [ADR 0110](../decisions/0110-latest-y-migracion-en-arranque.md).

### Evidencia de esta tarea

- `node --test scripts/compose-contract.test.mjs scripts/package-release.test.mjs`: 8/8.
- `pnpm test:scripts`: 50/50.
- `docker compose --env-file /dev/null -f compose.yaml config -q`: correcto.
- `docker build -f apps/server/Dockerfile --target app -t axia-app:local .`: correcto.
- `AXIA_IMAGE=axia-app:local bash scripts/docker-smoke.sh`: correcto; instalación vacía, migración
  integrada, historial antiguo, respaldo, restauración, login, evidencias y rechazo de destino
  poblado.
- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; 58 pruebas de navegador, 312 de PostgreSQL y
  build correcto. El primer intento falló por el test flaky `/perfil` a 390 px; el reintento
  dirigido y la compuerta completa quedaron verdes.
- `node scripts/check-docs.mjs`: 42 archivos, 0 enlaces rotos.
- Integrada a `main` y publicada como `v0.8.0`; evidencia en la sección superior.

## v0.7.0 publicada

- Etiqueta `v0.7.0` creada desde `main` en `50bc1b56d7b445b27ec8766e64ee2eea8d381ab6`.
  [Flujo 41676229970](https://github.com/MarcosAvg/axia/actions/runs/41676229970) y
  [CI 41676230026](https://github.com/MarcosAvg/axia/actions/runs/41676230026) terminaron en
  `success`.
- Imagen pública `ghcr.io/marcosavg/axia/axia-app:v0.7.0` y
  `ghcr.io/marcosavg/axia/axia-app:50bc1b56d7b445b27ec8766e64ee2eea8d381ab6`, digest
  `sha256:65d153c21e5147ad5a23b82d2868ce9c5f34444ce1044f8d01594ffb38a42382`.
- [Release v0.7.0](https://github.com/MarcosAvg/axia/releases/tag/v0.7.0) con
  `axia-self-hosted.tar.gz` (SHA-256 `20e36e215be2e880511999ff7eb2d8aabf3ad98ff360063d71056e7c255fedee`)
  y su `.sha256`; `release.json` fija la imagen por el digest anterior y la plantilla
  `.env.example` lo conserva.
- Limpieza local: ramas fusionadas `fix/calificacion-modal-validacion`, `fix/despliegue-simple` y
  `fix/dev-puertos-ocupados` eliminadas; PostgreSQL de pruebas detenido. La rama
  `fix/endurecimiento-despliegue-docker` sigue sin fusionar y no se borró.

## Tarea completada en rama: endurecimiento mínimo del despliegue Docker

- `migrate` desactiva el healthcheck heredado de la imagen, ejecuta con `no-new-privileges` y
  `cap_drop: ALL`; una migración larga ya no deja el servicio `unhealthy` ni hace fallar
  `docker compose up -d --wait`.
- PostgreSQL usa `shm_size: 128mb` para que las consultas paralelas no se queden sin `/dev/shm`.
- La documentación exige secretos hexadecimales (`openssl rand -hex 32`) y advierte que `/`, `#`,
  `?` o `%` rompen las URLs de conexión.
- Se mantiene el resto del despliegue sin cambios: tres servicios, una imagen, proxy externo.

### Evidencia de esta tarea

- `node --test scripts/compose-contract.test.mjs`: 6/6.
- `pnpm test:scripts`: 50/50.
- `docker compose --env-file /dev/null -f compose.yaml config -q`: correcto.
- `node scripts/check-docs.mjs`: 41 archivos, 0 enlaces rotos.
- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; 58 pruebas de navegador, 312 de PostgreSQL y
  build correcto. Persiste el aviso previo de chunks >500 kB.
- Integrada a `main` en `614aa1c`, junto con `fix/dev-puertos-ocupados`. La rama
  `fix/endurecimiento-despliegue-docker` no se integra: se sustituyó por este alcance mínimo.
- No se ejecutó el smoke Docker completo.

## Tarea completada en rama: arranque local detecta puertos ocupados

- Causa del “no carga la app”: un `pnpm dev` del 2 de noviembre seguía vivo y colgado en
  `127.0.0.1:3100` (su terminal ya no existía y sus conexiones a PostgreSQL estaban en
  `CLOSE-WAIT`). El `pnpm dev` nuevo levantaba la web en 5173, pero la API no podía escuchar y el
  proceso quedaba vivo por el puente de eventos; el navegador hablaba con la API vieja, que no
  respondía ni a `/api/health/live`.
- `pnpm dev` ahora comprueba API y web antes de Docker o migraciones y falla con un mensaje que
  nombra el puerto ocupado. El servidor detiene el puente de eventos y sale con código 1 si
  `listen` falla. Prueba nueva: `scripts/dev-ports.test.mjs`.

## Tarea completada en rama: asignación líder/auxiliar, titularidad y reclamación

- `assign_technician` asigna líder si el técnico está designado para la categoría; si no, agrega un
  auxiliar y exige motivo `auxiliary_support`. La lista de técnicos expone `categoryIds` y marca
  “Líder” o “Auxiliar”. Reasignar al líder exige motivo y ya se permite en `in_progress`/`paused`;
  los auxiliares activos permanecen. Decisión en el
  [ADR 0109](../decisions/0109-asignacion-lider-auxiliar-y-reclamacion.md).
- La titularidad se exige en cualquier estado para las acciones de coordinación del supervisor
  (asignar, auxiliares, recapturar, rechazar, cancelar, prioridad, duplicado y resolver
  reclamación). Las acciones propias (`own`) y el administrador no se bloquean. El formulario oculta
  esas acciones a un supervisor sin toma.
- Abrir una reclamación cierra tramo/pausa y participaciones; la asignación se conserva. Si procede,
  el ciclo avanza y se reabre al mismo líder; si se desestima, se termina la asignación. La
  reasignación de supervisor valida que el destino cubra el equipo y edificio.
- Recaptura: si cambia el equipo o edificio se cierran todos los participantes; si cambia la
  categoría solo permanece el técnico asignado cuando sigue designado. Reasignar supervisor también
  cierra a los auxiliares.

## Evidencia de esta tarea

- `AXIA_ENV_FILE=/dev/null pnpm check:fast`: código 0; lint, tipos, 64 pruebas de servidor y 348 de
  web.
- `AXIA_ENV_FILE=/dev/null pnpm test:e2e:smoke`: 17/17 verdes.
- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; estáticos y knip, 46 pruebas de scripts, 64 de
  servidor, 348 de web, 312 de PostgreSQL, 58 de navegador y build correcto. Persiste el aviso de
  chunks >500 kB.
- Documentación: 41 archivos, 0 enlaces rotos. `pnpm check:agnostic`: 812 archivos, 0 coincidencias.
- Pruebas nuevas: `tickets-assignment-rules-http`, `tickets-claims-http`,
  `assignment-form.test` y el caso de proxy con toma previa.
- Pendiente: integrar la rama `fix/asignacion-lider-auxiliar` a `main` (sin push ni merge todavía).

## Tarea cerrada: calificación en modal, bloqueos y toma obligatoria

- El 500 al calificar venía de `ON CONFLICT DO UPDATE`: `axia_app` no tiene `UPDATE` sobre
  `ticket_ratings` porque la tabla es de solo agregar. Ahora la inserción usa `DO NOTHING` y una
  segunda calificación responde 409.
- La calificación se abre en un modal al confirmar la validación del solicitante; también queda un
  botón “Calificar” si se cierra sin enviar. Se permite calificar en `attended` cuando el lado del
  solicitante ya validó, además de en `closed`.
- Validar dos veces el mismo rol y ciclo responde 409. El solicitante que ya validó queda sin
  acciones mientras el tiquet siga `attended` o en reclamación y tampoco puede abrir una reclamación,
  ni siquiera tras el cierre. Un supervisor sí puede abrirla a nombre del solicitante; el servidor
  aplica ambas reglas.
- El detalle expone `isRequester` y `requesterValidated`. Decisión en el
  [ADR 0106](../decisions/0106-calificacion-modal-y-bloqueo-validacion.md).
- Un supervisor debe tomar el tiquet antes de asignar, reasignar, recapturar, rechazar, cancelar,
  cambiar prioridad o marcar duplicado. La toma implícita al asignar se retiró; el administrador
  conserva la cola sin ruteo. El detalle expone `hasTaken`. Decisión en el
  [ADR 0107](../decisions/0107-tomar-antes-de-actuar.md).
- El tiempo y la evidencia se atribuyen al sujeto proxy (técnico o solicitante), no al actor. La
  migración 0021 añade sujeto solicitante/usuario a eventos y tramos, divide el trabajo cuando cambia
  el sujeto, rellena el historial y reconstruye los tramos. Se añaden reportes por técnico y por
  solicitante. En validación `both` el solicitante valida primero y el supervisor después. Decisión
  en el [ADR 0108](../decisions/0108-atribucion-sujeto-proxy.md).

## Evidencia de esta tarea

- Pruebas dirigidas: `tickets-lifecycle-http`, `tickets-rating-lock-http` y
  `tickets-subject-time-http` con la aplicación conectada como `axia_app`; `tickets-read` con los
  fixtures del rol dueño. Todas verdes.
- `AXIA_ENV_FILE=/dev/null pnpm check:fast`: código 0; lint, tipos, 64 pruebas de servidor y 343 de
  web.
- `AXIA_ENV_FILE=/dev/null pnpm test:e2e:smoke`: 17/17 verdes, incluido validar, calificar en el
  modal, ocultar acciones y persistir el resumen tras recargar.
- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; estáticos y knip, 46 pruebas de scripts, 64 de
  servidor, 343 de web, 306 de PostgreSQL y 58 de navegador; build correcto. Persiste el aviso
  previo de chunks >500 kB.
- Documentación: 40 archivos, 0 enlaces rotos. `pnpm test:affected`: 306 pruebas de servidor, 107
  de web y el flujo E2E dirigido, todas verdes.
- Revisión independiente del diff: dos hallazgos importantes corregidos; la guarda del solicitante
  validado ahora corre dentro de la transacción, después del replay y del bloqueo, con prueba de
  reintento idempotente.

## Tarea cerrada: detección y revisión de duplicados

- Una sola detección para el aviso y el alta: tiquets no finales del mismo edificio y ventana
  configurable. Son candidatos los de misma ubicación y problema, o texto normalizado por encima del
  umbral; el puntaje compuesto ordena y explica las coincidencias.
- Configuración real de ventana, umbral y campos visibles en `/admin/configuracion`, con API,
  formulario y pruebas; el aviso proyecta solo los campos permitidos.
- Decisiones auditadas: se marcan los candidatos mostrados al registrar de todas formas, el elegido
  al enlazar y los descartados, con actor y fecha. El aviso aparece arriba del detalle, con badge en
  lista, tabla y encabezado; el formulario de marcado precarga los candidatos y mantiene la búsqueda
  por folio como alternativa. Enlace visible “Duplicado de”.
- El original debe ser visible o haber sido candidato, no puede ser ya un duplicado y no se permiten
  ciclos. Al recapturar se recalculan las alertas pendientes.
- Migraciones 0019 y 0020; se corrigió la lectura de los tipos de evento como arreglo. El relleno
  `pnpm db:duplicates` recalcula los tiquets abiertos existentes. Decisión en el
  [ADR 0105](../decisions/0105-deteccion-revision-duplicados.md).

## Evidencia de esta tarea

- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; lint, tipos, estáticos y knip, 60 pruebas de
  servidor, 331 de web, 287 PostgreSQL y build.
- `AXIA_ENV_FILE=/dev/null pnpm test:e2e:smoke`: 17/17 verdes, incluidas las dos pruebas nuevas de
  aviso, marcado y descarte de duplicados.
- Documentación: 37 archivos, 0 enlaces rotos. Persiste el aviso previo de chunks >500 kB.
- Versión v0.6.0 etiquetada y publicada; imagen y release verificadas abajo.

## Tarea anterior: eliminar catálogos sin uso

- Cada fila de catálogo ofrece “Eliminar” con confirmación explícita. Se borra solo si nada lo
  referencia; si tiquets, historial o configuración lo usan, el servidor responde 409 con la causa
  (“tiene subestados”, “tiene ubicaciones”) y sugiere desactivarlo.
- Los vínculos propios se retiran con el registro (dependencia–ubicación, franjas y festivos,
  designaciones del técnico). Los compartidos se comprueban antes: designaciones de una categoría,
  ubicaciones vinculadas a dependencias y avisos de un solicitante.
- RN-22 admite la excepción de registros nunca usados; decisión en el
  [ADR 0104](../decisions/0104-borrado-catalogos-sin-uso.md).
- Pruebas: borrado libre, dependencia con vínculos, conflicto por edificio, motivo con subestados y
  categoría designada, 404 al repetir y permiso. E2E crea edificio y ubicación, bloquea el borrado
  y después elimina ambos.

## Evidencia de catálogos sin uso

- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; lint, tipos, estáticos y knip, 60 pruebas de
  servidor, 331 de web, 276 PostgreSQL y build. Documentación: 36 archivos, 0 enlaces rotos.
- `AXIA_ENV_FILE=/dev/null pnpm test:e2e:smoke`: 15/15 verdes, incluida la eliminación bloqueada y
  permitida.
- Persiste el aviso previo de chunks >500 kB.

## Tarea anterior: catálogos completos, jerarquía y orden

- La lectura administrativa de los 14 catálogos devuelve datos derivados: conteos de uso
  (ubicaciones, edificios, subcategorías, problemas, técnicos y designaciones), la cuenta
  vinculada de solicitantes y técnicos, la categoría de cada problema, la ruta y profundidad de
  cada motivo y los totales de franjas y festivos de los calendarios.
- Los derivados se consultan en un read model aparte (`admin-row-queries.ts`) y nunca se aceptan
  al guardar; las columnas editables conservan su validación.
- Las tablas muestran todas sus columnas declaradas más la última actualización; los textos largos
  se recortan con su título completo y la cuenta inactiva se marca.
- Motivos: árbol real con sangría por profundidad, guía visual, contraer/expandir por rama,
  agrupación por uso y búsqueda que conserva a los antecesores. Se retiró la sangría con guiones.
- Orden: relaciones y enums ordenan por su etiqueta visible (antes por UUID); se puede ordenar por
  activo y por actualización; en árbol se ordenan hermanos sin aplanar la jerarquía; en pantalla
  angosta hay selector de columna y dirección.

## Evidencia de catálogos completos

- Regresiones nuevas para orden por etiqueta, agrupación y contracción del árbol, datos derivados
  del catálogo y cuenta inactiva.
- `AXIA_ENV_FILE=/dev/null pnpm check:fast`: código 0; lint, tipos y 60 pruebas de servidor + 330
  de web.
- `AXIA_ENV_FILE=/dev/null pnpm test:e2e:smoke`: 14/14 verdes, incluidas las dos pruebas nuevas de
  datos derivados, contracción de motivos y orden en pantalla angosta.
- `AXIA_ENV_FILE=/dev/null pnpm check`: cierre código 0; estáticos y knip, 60 + 330 unitarias,
  268 pruebas PostgreSQL, lint, tipos y build. Persiste el aviso previo de chunks >500 kB.
- Documentación: `docs/reference/api.md` describe la lectura enriquecida.

## Tarea anterior: catálogos y demo operables

- Migración nueva 0018: 29 subestados para los nueve motivos iniciales de pausa incompletos;
  los diez árboles permiten pausar/reanudar. No cambia SQL integrado ni nodos personalizados.
- Servidor e interfaz evitan iniciar pausas sin salida. Administración valida motivos, parentesco,
  tipos y duplicados; protege árboles con pausas abiertas y muestra errores 400/409 comprensibles.
  Nuevos motivos activos por defecto y selectores operativos actualizados al guardar.
- Demo con ofertas utilizables, evidencias WebP sintéticas rotuladas, descripciones, validaciones
  y participación coherentes. Cobertura de ubicaciones, dependencias, clasificación, técnicos y
  supervisores comprobada; personas sin cuenta siguen siendo válidas.
- Reaplicar recupera solo ofertas faltantes de registrados sin actividad; no reescribe historial.
  Las evidencias/validaciones nuevas se crean en escenarios nuevos, no retroactivamente.
  CLI local y API comparten ruta de archivos, incluidas las configuraciones personalizadas.
- Decisión [0103](../decisions/0103-catalogos-operables-y-demo-coherente.md). Revisión independiente
  sin hallazgos pendientes tras corregir desfase de rutas demo/desarrollo. Negocio intacto.

## Evidencia de catálogos y demo

- Regresiones RED→GREEN para raíz sin salida, alta de motivos, padre inválido, duplicados, edición
  con pausa abierta, demo sin ofertas, evidencias/validaciones y ruta local de imágenes.
- `AXIA_ENV_FILE=/dev/null pnpm check:fast`: código 0; lint, tipos y 367 pruebas.
- `pnpm test:affected`: detectó fixture antiguo de pausa sin subestado. Se reutiliza el motivo
  preconfigurado completo sin quitar aserciones; prueba afectada 4/4 verde.
- `AXIA_ENV_FILE=/dev/null pnpm test:e2e:smoke`: 12/12 verdes, incluida alta de raíz y subestado.
- `AXIA_ENV_FILE=/dev/null pnpm check`: cierre código 0; 46 Node + scripts Bash, 60 servidor,
  307 web, 53 navegador y 261 PostgreSQL; lint, tipos, estáticos y build verdes.
  Se corrigieron antes límites de tamaño de fixtures y una exportación sin consumidor; reglas intactas.
- Documentación: 35 archivos, cero enlaces rotos. Persiste aviso previo de chunks >500 kB.
- Integración y push completados; imagen publicada y verificada como se indica abajo.
  Sin cambios en infraestructura de producción.

## Imagen publicada y siguiente paso operativo

- Etiqueta `v0.6.0` creada desde `main`, commit
  `e2f7ff1e64ce0e31b03778a2d3086a6bc2f16bf8`.
- [Flujo 41267688905](https://github.com/MarcosAvg/axia/actions/runs/41267688905): verificación,
  Docker y publicación `success`. La CI de `main` también terminó correctamente.
- Imagen pública `ghcr.io/marcosavg/axia/axia-app:v0.6.0` y
  `ghcr.io/marcosavg/axia/axia-app:e2f7ff1e64ce0e31b03778a2d3086a6bc2f16bf8`. Digest confirmado
  directamente en GHCR:
  `sha256:b916e9003d759c32e37233a05c8ff7bde73f80cb0b3fd3b181ba71b35089e8db`.
- Release `v0.6.0` con el paquete `axia-self-hosted.tar.gz` y su `.sha256`. `v0.5.1` sigue
  disponible.

Actualizar la instancia requiere autorización. Las migraciones 0019 (revisión de duplicados) y 0020
(permiso para retirar alertas pendientes) se aplican durante la actualización normal. Para
escenarios demo completos usar una base local nueva; no reiniciar una base cuyo trabajo deba
conservarse. Probar instalación en host limpio, configurar TLS y programar respaldos/limpieza con
restauración periódica siguen pendientes operativos.

## Diferencias de producto conocidas

La [especificación de negocio](../concepts/negocio.md) sigue siendo normativa:

- RN27: acción offline tardía rechazada/conflictiva no deja el evento sin efecto requerido.
- RN17: recaptura restringida a registrado/con supervisor/asignado, sin motivo obligatorio;
  RN06: reasignación directa a supervisor termina en `with_supervisor`.
- Tipo de servicio opcional en API de alta/atención; UI lo exige al atender.
- `auto_validation_days` configurable sin tarea automática; tampoco hay Web Push ni escalamiento.
- Botones calculados en cliente sin ámbito/participación/ventana; servidor rechaza acciones inválidas.
- La demo conserva la cobertura de una supervisora sobre dos equipos; RN04 limita a uno y esa
  restricción no se impone actualmente. No causa falta de ruteo, pero requiere revisión específica.
