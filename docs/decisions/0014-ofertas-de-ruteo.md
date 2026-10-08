# 0014 — Ofertas de ruteo a supervisores candidatos

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

Un tiquet nuevo debe ofrecerse a los supervisores del equipo de su categoría que cubren su
edificio. Si varios lo ven, quien lo toma primero lo atiende y desaparece para los demás.

## Decisión

Al crear el tiquet se generan **ofertas** (`ticket_offers`), una por supervisor candidato
(`supervisor_scopes` del equipo + edificio). Al tomarlo o asignar técnico, las demás ofertas pasan
a `withdrawn` conservándose en el historial. Sin candidatos, el tiquet queda `registered` como
"sin ruteo" (alerta a administradores). Regla **"primero gana"** en acciones simultáneas o tardías.

## Alternativas consideradas

- **Asignar directo a un supervisor:** quita la competencia/visibilidad entre candidatos.

## Consecuencias

- El ruteo se recalcula al reasignar a otro equipo.
- La concurrencia se apoya en `client_request_id` y en que la primera acción gana.
