# 0005 — Modelo de bloqueos dirigido por datos

- Fecha: 2026-10-07
- Estado: sustituida por 0011

## Contexto

Los motivos por los que un tiquet no avanza (falta de material, técnico no capacitado, sin técnico
disponible, espera de proveedor…) son variados y cambian con el tiempo. Cada motivo tiene sus
propios subestados y campos adicionales (proveedor, medio de compra, fecha estimada de entrega,
número de cotización). Escribirlos en código obligaría a un despliegue por cada cambio.

## Decisión

Modelar los bloqueos como **datos, no como código**:

- `blocker_types`: motivo.
- `blocker_states`: subestados por tipo (orden, si es final).
- `blocker_transitions`: de qué estado a cuáles se puede pasar y con qué rol.
- `blocker_fields`: campos adicionales que pide cada estado.
- `ticket_blockers`: bloqueo concreto de un tiquet, con `data jsonb` para los valores dinámicos.

Un tiquet puede tener **varios bloqueos activos** a la vez y el estado macro `on_hold` se
**calcula** (no lo cambia una persona a mano); al resolverse el último bloqueo, vuelve a
`in_progress`.

## Alternativas consideradas

- **Enum fijo en código:** rígido; cada motivo nuevo exige migración y despliegue.
- **Una columna por motivo:** no escala y ensucia la tabla de tiquets.

## Consecuencias

- El administrador da de alta motivos y flujos sin desplegar.
- Las transiciones y los campos obligatorios se validan en las funciones RPC.
- Las vistas de métricas (tiempo en pausa por motivo) se calculan sobre estos datos.
- La semilla inicial de tipos y subestados está pendiente (pregunta 1 de `docs/ESTADO.md`).
- Revertir es posible: el flujo vive en datos y puede migrarse.
