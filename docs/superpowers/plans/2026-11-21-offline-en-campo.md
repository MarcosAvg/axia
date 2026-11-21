# Plan de implementación del modo offline en campo

> Para ejecutar cada entrega, usar superpowers:executing-plans o superpowers:subagent-driven-development según el método acordado.

**Objetivo.** Que el técnico pueda preparar su jornada, retomar la PWA sin señal, conservar lo que captura y resolver pendientes al reconectar.

**Arquitectura.** Reutilizar las consultas persistidas de TanStack Query para lectura y Dexie para borradores y operaciones. Derivar la disponibilidad del contenido realmente guardado. El servidor conserva la autoridad sobre el estado y los permisos.

**Referencias.** [RN-27](../../concepts/negocio.md), [lectura offline](../../decisions/0113-arranque-lectura-offline.md), [proyección local](../../decisions/0116-proyeccion-local-acciones-offline.md) y [convenciones](../../reference/convenciones-codigo.md).

## Alcance y orden

- Alta de tiquets fuera del plan. Los borradores corresponden a acciones sobre tiquets existentes.
- Respetar los siete días de vigencia de la sesión y la política vigente de caché por usuario. Mantener los textos de interfaz en es-MX.
- La entrega 1 aporta valor por sí sola. Las entregas 2 y 3 pueden avanzar después de la 1 en cualquier orden. La 4 se apoya en el detalle local de la 3.
- Antes de dar por confirmada una captura offline en la entrega 2, hacer atómico el guardado local de evidencia y su entrada de cola. Para la entrega 4, verificar el reenvío idempotente tras respuesta perdida y distinguir los fallos transitorios de los rechazos definitivos antes de ofrecer una resolución.

## 1. Preparar la jornada en Mi trabajo

**Puntos de entrada.** `routes/_authenticated/mi-trabajo.tsx`, `app/query-persister.ts`, `features/auth/offline-session.ts` y las consultas que usa el detalle de tiquet.

- [ ] Escribir pruebas de preparación completa, parcial, cambio de usuario durante la descarga y arranque con caché caducada. Un detalle visible en memoria sin persistir todavía cuenta como pendiente de preparar.
- [ ] Añadir «Preparar para trabajar sin conexión» para una selección de tiquets. Reutilizar las claves y consultas del detalle y sus catálogos. Mostrar progreso, total listo y reintento de fallidos.
- [ ] Derivar «Disponible sin conexión» y el filtro de Mi trabajo a partir de los datos persistidos para el usuario actual. Mostrar la fecha de la copia y la vigencia de la sesión. Ante un detalle ausente, ofrecer regreso a Mi trabajo y explicar que hace falta conexión.
- [ ] Ampliar `apps/web/e2e/offline.spec.ts` para preparar un tiquet, cerrar la pestaña, desconectar, abrir una pestaña nueva en el mismo perfil y hacer una acción con foto. Comprobar que el tiquet sin preparar presenta el mensaje correspondiente y que la acción del preparado se sincroniza al volver la red.

## 2. Conservar la captura en curso

**Puntos de entrada.** Formularios de acción de tiquets, `lib/offline/db.ts`, `lib/offline/outbox.ts` y `features/tickets/api/offline-evidence.ts`.

- [ ] Probar que una pausa recupera su nota y foto tras reabrir la app, que otra cuenta no ve el borrador y que una escritura fallida deja el borrador recuperable.
- [ ] Empezar con pausa e inicio con evidencia. Guardar y restaurar campos por usuario, tiquet, ciclo y acción. Ofrecer retomar o descartar. Si cambió el ciclo o la acción dejó de estar disponible, conservar el contenido para revisión y pedir confirmación antes de reutilizarlo.
- [ ] Retirar el borrador al confirmar solo cuando su contenido ya esté en la cola o confirmado por el servidor. Para capturas offline, guardar foto y entrada de cola en una transacción Dexie. Mostrar «Guardado en este dispositivo» después de confirmar la escritura. Si se agota el almacenamiento, mostrar el error y mantener abierto el formulario.

## 3. Dar contexto al trabajo local dentro del tiquet

**Puntos de entrada.** `features/tickets/hooks/use-pending-actions.ts`, `features/tickets/components/ticket-timeline.tsx` y `features/tickets/components/pending-evidence.tsx`.

- [ ] Probar una secuencia de inicio y pausa con evidencia. Verificar el orden, el estado local de cada entrada, la ausencia de duplicados tras sincronizar y el comportamiento cuando se actualiza el historial con retraso.
- [ ] Mostrar las entradas locales en la línea de tiempo, con su hora de captura, estado de envío y vista previa de la evidencia cuando esté disponible. Reutilizar la información de la cola y conservar el UUID para conciliar con el evento confirmado cuando el contrato lo exponga. Mantener visible «Sin sincronizar» mientras la operación sea local.

## 4. Resolver pendientes al recuperar señal

**Puntos de entrada.** `features/tickets/components/pending-actions.tsx`, `features/tickets/components/outbox-time-correction.tsx` y `features/shell/components/offline-indicator.tsx`.

- [ ] Probar una acción rechazada porque el tiquet avanzó en otro dispositivo, un rechazo de hora corregible y una indisponibilidad temporal. Verificar que una operación fallida explica qué acciones posteriores quedaron esperando.
- [ ] Enlazar cada fallo del indicador al tiquet correspondiente. Mostrar allí la acción local, su motivo de rechazo y el estado confirmado más reciente disponible. Usar corrección de hora cuando corresponda y reintento para fallos recuperables.
- [ ] Antes de descartar, mostrar qué se quitará del dispositivo y qué operaciones posteriores quedan pendientes de revisión. Mantener visibles los envíos y pendientes de otros tiquets aunque haya un fallo.

## Verificación y cierre

- [ ] En cada entrega, ejecutar primero las pruebas nuevas y confirmar que detectan el comportamiento faltante. Después ejecutar `pnpm test:affected`, `pnpm check:fast` y `pnpm test:e2e:smoke`. Actualizar la documentación y el changelog con el comportamiento visible en el mismo commit.
- [ ] Si cambia el reconocimiento de reenvíos en el servidor, ejecutar `pnpm db:test` con PostgreSQL real. Incluir una respuesta perdida seguida de un evento posterior.
- [ ] Probar el recorrido de campo en una PWA instalada en Android y iOS antes del cierre. Incluir señal intermitente, reanudación tras cerrar la app y una segunda cuenta en el mismo dispositivo.
- [ ] Ejecutar `pnpm check` antes de integrar a main.
