# 0054 — Tomar la oferta al abrir el tiquet

- Fecha: 2026-10-10
- Estado: aceptada

## Contexto

El ruteo (RN-03) genera **ofertas** para los supervisores candidatos, pero el estado del tiquet
seguía en `registered` ("Registrado") hasta que alguien lo tomara. La acción **"Tomar"**
(`ticket_take`) **no estaba conectada a la interfaz** (existían el RPC, la mutación y el texto, pero
no un botón): en la práctica **nunca se pasaba a `with_supervisor`** y el solicitante no veía que un
supervisor lo hubiera tomado. Además, el estado se llamaba "Con supervisor" y el evento "Tomado por
supervisor", lo que confundía.

## Decisión

- **Auto-tomar al abrir el detalle**: si el tiquet está `registered` y el usuario **tiene una oferta
  activa** para ese tiquet, al abrir el detalle se llama a `ticket_take` (una sola vez) → pasa a
  `with_supervisor`. Si otro supervisor ya lo tomó, no hay oferta y no se dispara.
- **Renombrar** la etiqueta del estado `with_supervisor` de "Con supervisor" a **"Tomado por
  supervisor"**, para que coincida con el evento.
- Tras tomar, el supervisor dispone de **"Asignar técnico"** y **"Reasignar supervisor"** (mandarlo a
  otro supervisor con motivo + nota), que en `registered` no aparecía.
- **Asignar técnico** sigue retirando las ofertas.

## Alternativas consideradas

- **Botón "Tomar" explícito**: requería un paso manual; se prefirió que abrir el tiquet implique
  reclamarlo.
- **No tocar nada y solo documentar**: dejaba el estado `with_supervisor` inalcanzable en la interfaz.

## Consecuencias

- Abrir un tiquet ofrecido lo reclama: el solicitante ve el cambio y la línea de tiempo registra
  `taken`; los demás supervisores pierden la oferta.
- El flujo queda `registered → tomar → with_supervisor → asignar técnico → assigned`.
- Prueba e2e nueva (`e2e/take-offer.spec.ts`) que cubre el cambio de estado al abrir.
