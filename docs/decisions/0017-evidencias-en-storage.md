# 0017 — Evidencias en Storage con bucket privado por tiquet

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

La Fase 3A enciende el flujo del técnico, y `ticket_start`/`ticket_attend` exigen evidencia
(`before`/`after`). La Fase 4 es la que hará la captura de campo (cámara, compresión, subida
reanudable y cola sin conexión), pero sin una vía mínima de evidencia en línea el técnico no podría
iniciar ni atender.

## Decisión

- Bucket **privado** `evidence` con límite de tamaño y tipos permitidos (imágenes y PDF).
- **Ruta por tiquet**: `tickets/<ticket_id>/<ciclo>/<uuid>.<ext>`.
- Políticas de `storage.objects` **ligadas a `public.can_see_ticket`**: solo quien puede ver el
  tiquet sube o lee su evidencia; se lee con **URL firmada** temporal.
- RPC **`evidence_add`** (idempotente por `client_request_id`) que registra la evidencia, la liga a
  su evento `evidence_added` y la atribuye al usuario en sesión.
- Alcance de la Fase 3A: evidencia **en línea**. La cámara, la compresión, la subida reanudable
  (TUS) y la cola offline llegan en la Fase 4 sobre este mismo modelo.

## Alternativas consideradas

- **URLs firmadas generadas por una Edge Function** con la `service role key`: más piezas y no hacía
  falta para el alcance; las políticas de Storage ya expresan la regla.
- **Guardar solo metadatos** sin archivo: no permitía iniciar/atender y no aporta valor.

## Consecuencias

- El límite y los tipos de archivo viven en el bucket; el núcleo no almacena binarios.
- `can_see_ticket` se amplió para incluir a los **participantes auxiliares** (antes solo el líder),
  necesario para que un auxiliar vea el tiquet y aporte evidencia.
- Las políticas de Storage no se prueban con pgTAP (fuera del alcance de la base); el bucket y las
  políticas se verifican por consulta a `storage.buckets`/`pg_policies` y con la prueba E2E del
  técnico, que sube evidencia real.
