# 0081 — Hora por acción y ajuste auditado

- Fecha: 2026-10-23
- Estado: parcial (la hora manual de acciones se limita al proxy en el ADR 0084)

## Contexto

El registro de tiempos manuales como tramos de inicio y fin era confuso para el trabajo de
seguimiento: el administrador o supervisor no registra un tramo abstracto, sino la hora en que
ocurrió una acción concreta mientras actúa en nombre de otra persona. El tiquet ya deriva sus
tramos de `ticket_events.occurred_at`, pero las acciones en línea no permitían fijar esa hora.

## Decisión

- El alta de tiquet y todas las acciones aceptan `occurredAt`.
- La hora del evento es la fuente de los `time_spans`.
- Administrador y supervisor pueden ajustar la hora de cualquier evento desde la línea de tiempo,
  siempre que quede entre el evento anterior y el siguiente.
- El ajuste escribe un evento de auditoría `event_time_corrected` y reconstruye los tramos del
  tiquet desde el historial.
- No se crean tramos manuales independientes; se retiró ese flujo.
- La evidencia conserva su función probatoria. La metadata EXIF puede sugerir la hora, pero no es
  obligatoria porque WhatsApp y otros servicios la eliminan.

## Consecuencias

- Registrar una acción pasada es una sola fecha, no un intervalo inicio/fin.
- El total continuo del tiquet sigue siendo el intervalo registro-cierre; el ajuste afecta el
  desglose por tipo y los límites de los eventos.
- Los cambios de hora son auditables y no borran el evento original.
