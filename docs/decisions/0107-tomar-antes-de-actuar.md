# 0107 — Tomar el tiquet antes de las acciones del supervisor

**Fecha:** 2026-11-02
**Estado:** aceptada

## Decisión

Un supervisor debe tener una asignación abierta como titular del tiquet —es decir, haber enviado
`take`— antes de ejecutar las acciones de coordinación sobre un tiquet `registered`. Hasta entonces
no puede asignar técnico, reasignar supervisor, agregar auxiliares, recapturar, rechazar, cancelar,
cambiar la prioridad ni marcar duplicado. La restricción se aplica en el servidor mediante el
contexto de acceso del tiquet y también se refleja en la interfaz.

Tomar la oferta, consultar el tiquet y comentar siguen disponibles antes de la toma. El
administrador conserva la cola de tiquets sin ruteo y puede asignar desde `registered` sin una toma
propia. El solicitante mantiene las acciones propias sobre su tiquet, como cancelar o marcar
duplicado, porque su ámbito es `own` y no la coordinación del equipo.

Se retira la toma implícita de `assign_technician`: asignar desde `registered` ya no crea una
asignación de supervisor ni un evento `taken`. El flujo correcto es tomar y después asignar.

## Alternativas y consecuencias

Se descartó mantener la toma implícita porque permitía que un supervisor modificara el tiquet sin
aceptar formalmente la oferta y sin que la toma quedara en el momento en que ocurrió. La
contrapartida es un paso más antes de asignar; el aviso **Tomar tiquet** ya estaba presente en la
interfaz y ahora es obligatorio en el flujo normal.

La excepción del administrador es necesaria para los tiquets sin ruteo: si no hay supervisor
candidato, nadie podría tomar la oferta y la cola quedaría bloqueada. La regla se limita a las
acciones de coordinación; las acciones del técnico, la validación y la reclamación conservan sus
propias precondiciones de estado y participación.

El detalle expone `hasTaken` para que la interfaz oculte las acciones sin depender de inferir la
asignación desde la línea de tiempo. La comprobación del servidor usa el estado del tiquet y la
asignación abierta, no solo el permiso de equipo, para que un supervisor del mismo equipo no pueda
saltarse la toma.
