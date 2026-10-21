# 0071 — Autorización central y alcance de tiquets

**Fecha:** 2026-10-21
**Estado:** aceptada

## Contexto

La versión autoalojada no usa RLS. El servidor es el único cliente de PostgreSQL, pero cualquier
consulta que olvide el alcance puede filtrar tiquets entre equipos, edificios o solicitantes. La
autorización debe ser explícita, reutilizable y comprobable.

## Decisión

1. **Un único `can(actor, permission, ticket?)`** decide si un actor puede ver o actuar. Es una
   función pura, sin base de datos y con pruebas unitarias.
2. **El ámbito más amplio gana.** Si un permiso aparece en varios roles, se aplica
   `all` > `buildings` > `team` > `own`.
3. **`own` depende del permiso.** No es un único “propio”:
   - solicitante para validar, reclamar y calificar;
   - técnico asignado o participante activo para iniciar, atender, pausar, reanudar y recapturar;
   - solicitante, técnico/participante o supervisor para cancelar y marcar duplicado;
   - solicitante, técnico/participante o supervisor asignado para ver.
4. **`team`** usa el equipo del técnico y los equipos de los ámbitos activos del supervisor.
5. **`buildings`** exige el par **equipo + edificio**, no solo el edificio, para conservar la regla
   anterior.
6. **La timeline del solicitante se filtra** por `requester_visible_event_types` aunque el actor
   también tenga un rol de personal.
7. **Las acciones exigen primero ver el tiquet.** `canAct` comprueba `ticket.view`; si el tiquet no
   es visible se responde 404. Si es visible pero falta el permiso concreto, 403.
8. **El repositorio es la puerta única.** La condición SQL vive en `scope.ts` y la usan lista,
   detalle y timeline. No se expone `findAll`, ni consultas de tiquets fuera del repositorio.
9. **Las métricas no se publican todavía.** Sus vistas globales no llevan alcance; se adaptarán en
   el tramo 5 con parámetros o consultas acotadas y pruebas negativas.
10. **No se añaden rutas de lectura en este tramo.** Las rutas de 5A reutilizarán el repositorio y
    repetirán la matriz por HTTP.

## Consecuencias

- Un usuario inactivo no tiene actor y no llega al repositorio.
- Un tiquet fuera de alcance es indistinguible de uno inexistente.
- Las pruebas cubren solicitante, técnico, participante, supervisor por edificio, otro equipo y
  usuario sin permiso.
- Los índices existentes cubren las búsquedas principales por `ticket_id`; cualquier índice nuevo
  se decidirá con `EXPLAIN` y datos representativos.

## Alternativas descartadas

- **RLS en esta versión:** se retiró para evitar políticas duplicadas y porque el servidor es el
  único cliente; se puede añadir más adelante sin cambiar el modelo.
- **Comprobar permisos en cada ruta con consultas ad hoc:** repite la regla y facilita fugas.
- **Filtrar en el cliente:** no es una frontera de seguridad.
