# 0055 — Visibilidad del solicitante en la línea de tiempo

- Fecha: 2026-10-10
- Estado: aceptada

## Contexto

RN-23 filtra la línea de tiempo del solicitante: solo ve los `event_type` listados en
`instance_settings.requester_visible_event_types`. El valor por defecto omitía la **recaptura**
(`capture_recaptured`) —que la especificación sí pide mostrar— y los **cambios de estado** de
reasignación (`reassigned_supervisor`, `reassigned_technician`) y prioridad (`priority_changed`).
Además, aunque la regla dice "configurable por tipo", **no había forma de configurarla** desde la app.

## Decisión

- **Ampliar el valor por defecto** con `capture_recaptured`, `reassigned_supervisor`,
  `reassigned_technician` y `priority_changed` (18 tipos en total). Las notas (`comment`) y la
  evidencia siguen siendo internas.
- La migración **actualiza la fila existente** solo si conserva el valor por defecto anterior, para no
  pisar una configuración personalizada.
- **Hacerlo configurable** en Administración → Configuración: sección **"Visibilidad del solicitante"**
  con casillas por tipo de evento (etiquetas de `eventLabels`), guardado con el resto de ajustes.

## Alternativas consideradas

- **Solo cambiar el valor por defecto**: no cumple "configurable por tipo".
- **Mostrar todo al solicitante**: contradice RN-23 (las notas son internas).

## Consecuencias

- El solicitante ve la recaptura y los cambios de estado relevantes; sigue sin ver notas, evidencia ni
  apoyo auxiliar.
- El administrador ajusta los tipos visibles sin migrar.
- pgTAP de la vista (`96_timeline_view.test.sql`) verifica que el solicitante ve `capture_recaptured` y
  no `auxiliary_added`/`comment`.
