# 0085 — Correcciones del ciclo de vida y de la barra de acciones

- Fecha: 2026-10-25
- Estado: aceptada

## Contexto

La auditoría del flujo (estados, transiciones y acciones del detalle) encontró cuatro defectos que
podían sacar al tiquet de su ciclo o falsear sus tiempos:

- La recaptura del cliente enviaba las claves en `snake_case`, pero el servidor las esperaba en
  `camelCase`. Zod descartaba los campos desconocidos y solo se aplicaba `description`: cambiar
  edificio, ubicación o categoría no hacía nada y el tiquet no se reruteaba.
- Reasignar al supervisor desde `in_progress` o `paused` cambiaba el estado sin cerrar la pausa ni
  el tramo activo; el técnico anterior conservaba asignación y participación.
- Los descartes (`rejected`, `cancelled`, `duplicate`) no fijaban `closed_at`, así que el tiempo
  total seguía creciendo; además el vínculo de duplicado sobrevivía a la reactivación y una
  reclamación procedente sobre un tiquet cerrado conservaba `closed_at`.
- La toma implícita al asignar desde `registered` (RN-05) no se registraba y la reasignación de
  técnico emitía `assigned_technician` en lugar de `reassigned_technician`.

## Decisión

- La recaptura se limita a `registered`, `with_supervisor` y `assigned`, antes de iniciar el
  trabajo (RN-10). Envía `camelCase`, la nota viaja en el evento y el servidor recalcula el ruteo:
  si cambia el equipo o el edificio vuelve a `registered` y se oferta a los candidatos nuevos; si
  solo cambia la categoría y el técnico ya no corresponde, vuelve a `with_supervisor` y se termina
  su asignación.
- Reasignar supervisor cierra la pausa abierta y el tramo de trabajo activo, y termina la
  asignación y participación del técnico anterior. La reasignación de técnico también cierra la
  participación anterior y emite `reassigned_technician`.
- Asignar técnico desde `registered` implica tomar: crea la asignación de supervisor del actor y el
  evento `taken`.
- Los descartes fijan `closed_at`, cierran las participaciones abiertas y resuelven una reclamación
  abierta con un evento `claim_resolved` (nota “Tiquet descartado”). La reactivación limpia
  `status_before_discard`, `closed_at` y `duplicate_of_id`; los enlaces históricos se conservan.
- Una reclamación procedente limpia `closed_at`, incrementa el ciclo y reabre la participación del
  técnico asignado si sigue vigente.
- Los tramos abiertos se cortan en `closed_at` para el cálculo por tipo, de modo que un tiquet
  final no siga acumulando trabajo o pausa. La reconstrucción de tramos cierra el trabajo activo en
  una reasignación de supervisor.
- El apoyo auxiliar solo se ofrece y acepta en `assigned`, `in_progress` y `paused`.

## Consecuencias

- La recaptura ya puede corregir la captura completa; un cambio de edificio o equipo rerutea el
  tiquet y retira las ofertas anteriores.
- Reasignar un tiquet en curso no deja pausas huérfanas ni participantes con acceso residual.
- Los tiquets descartados dejan de acumular tiempo y una reactivación no los deja marcados como
  duplicados.
- La barra de acciones refleja mejor el momento del flujo: no ofrece recaptura después de iniciar
  ni apoyo auxiliar antes de asignar.
- Queda pendiente que la barra se alimente del servidor para eliminar la copia de la matriz de
  transiciones en el cliente.
