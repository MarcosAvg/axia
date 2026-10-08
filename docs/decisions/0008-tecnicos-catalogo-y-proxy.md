# 0008 — Técnicos de catálogo con cuenta opcional y "actuar en nombre de"

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

El técnico puede no tener cuenta (la app debe funcionar incluso si la gestiona una sola persona).
Aun así, hay que registrar su trabajo y sus tiempos, y atribuirlos correctamente.

## Decisión

El **catálogo de técnicos** (`technicians`) tiene `user_id` opcional. La asignación apunta al
catálogo, no a la cuenta. Cuando el técnico o el solicitante no tienen cuenta, otra persona
**actúa en su nombre** (proxy): el administrador en general; el supervisor sobre sus técnicos. El
historial distingue **actor** (quién lo hizo) de **sujeto** (`subject_user_id`/`subject_technician_id`).

## Alternativas consideradas

- **Exigir cuenta al técnico:** descartado por la operación real.
- **No registrar al sujeto:** la auditoría mentiría.

## Consecuencias

- Permisos nuevos en el conjunto fijo: `ticket.create_on_behalf`, `act_on_behalf`,
  `time.record_manual`, `validate_on_behalf`, `cancel_on_behalf`, `open_claim_on_behalf`,
  `rate_on_behalf`.
- La RLS de "ver los míos" solo aplica a cuentas; los contactos quedan cubiertos por el proxy.
- Ver 0009 para los tiempos manuales que acompañan a este modelo.
