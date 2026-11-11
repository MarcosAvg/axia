# 0126 — Flujo de pausa con pasos de avance y salidas

**Fecha:** 2026-11-11
**Estado:** aceptada e implementada.

## Contexto

El catálogo de pausa era un árbol jerárquico. Al reanudar se aceptaba cualquier descendiente de
la raíz, así que una salida podía elegirse antes de que la condición estuviera resuelta. El
problema es de flujo, no de clasificación: «Falta de material» puede pasar por solicitado, en
cotización y en tránsito, y solo cuando llega a un paso concreto se habilita «Recibido». Algunos
subestados solo describen el avance y otros solo la salida.

El árbol tampoco representa convergencias. `Compra externa` y `Salida de almacén` deben poder
terminar ambas en `En tránsito` y luego en `Recibido`; un árbol tipado obligaría a duplicar nodos.

## Decisión

1. **El árbol de `reasons` se conserva para organizar el catálogo.** No define el orden de la
   pausa.
2. **Cada subestado de pausa tiene un tipo.** `reasons.pause_step_kind` vale `progress` o `exit`.
   Las raíces y los motivos de otros usos lo dejan nulo.
3. **El flujo es un grafo dirigido sin ciclos.** `pause_transitions(from_reason_id, to_reason_id)`
   une la raíz o un paso de avance con otro paso o con una salida. Una salida no tiene siguientes.
4. **La acción depende del subestado actual.** `advance_pause` solo acepta un destino `progress`
   con arista desde `ticket_pauses.reason_id`; `resume` solo acepta una salida con arista desde ese
   mismo estado. El servidor valida la arista, el tipo, la actividad y el motivo raíz.
5. **Los pasos y las salidas siguen separados en el historial.** `ticket_pause_steps` guarda solo
   avances; `ticket_pauses.closed_reason_id` guarda la salida. El tiempo por subestado no cambia.
6. **El flujo va siempre hacia delante.** El disparador de la tabla rechaza ciclos. Si más adelante
   hace falta retroceder, se cambia con una migración y un ADR nuevo.
7. **La semilla cubre los motivos frecuentes.** Se clasifican las salidas existentes y se agregan
   motivos y pasos para diagnóstico especializado, permisos y trámites, condiciones inseguras,
   documentación técnica, equipo de acceso y traslado de personal. Cada motivo nace con al menos
   una salida alcanzable.
8. **Administración edita el flujo por motivo.** Se agrega el tipo al formulario de motivos y un
   editor de transiciones. No se puede cambiar el flujo de un motivo con una pausa abierta. La
   exportación e importación incluyen una hoja «Transiciones de pausa» con Motivo, Desde y Hacia.
9. **La interfaz oculta las acciones sin opciones.** Si el subestado actual no tiene un siguiente,
   no se muestra «Avanzar subestado»; si no tiene salida, no se muestra «Reanudar».

## Alternativas descartadas

- **Árbol tipado con hijos como siguientes pasos.** Es más simple, pero no representa la
  convergencia de las ramas de material ni reutiliza una salida desde varios pasos.
- **Etapas ordenadas con umbral de salida.** Reordenar el catálogo cambiaría reglas en silencio y
  no permite que dos pasos de la misma etapa tengan salidas distintas.
- **Mantener «cualquier descendiente» y solo ocultar salidas en la interfaz.** El servidor seguiría
  aceptando una reanudación prematura.

## Consecuencias

- Una pausa puede quedar sin salida si administración configura mal un motivo; el servidor impide
  pausar un motivo sin salida alcanzable y la semilla se prueba con esa garantía.
- Los cambios de flujo se bloquean mientras haya una pausa abierta en el motivo, igual que los
  cambios estructurales del árbol.
- Las pausas históricas no se reescriben. Si un nodo cambia de tipo, el historial sigue mostrando
  el evento que ocurrió; el tiempo por subestado sale de los pasos y no se reinterpreta.
- La importación de transiciones reemplaza el flujo completo de cada motivo presente en la hoja.
  Los motivos sin filas conservan el suyo.

## Implementación

Migración `0051_pause_flow.sql`: tipo, columna, tabla, disparadores, semilla y permisos. Servidor:
validación en `reasons.ts` y `pause.ts`, opciones en `pause-read.ts`, API de administración en
`pause-flow.ts`. Web: opciones en el detalle, formularios sin cascada y editor de flujo. Pruebas de
semilla, integración de acciones, administración y E2E.

## Reversión

Volver a aceptar cualquier descendiente de la raíz y desactivar la tabla de transiciones; se pierde
la garantía de que una salida dependa del paso actual. No se edita una migración integrada: la
reversión se hace con una migración nueva y un ADR que sustituya este.
