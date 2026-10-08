# 0020 — Tiempos manuales atribuidos y proxy del técnico (Fase 4B)

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

La Fase 4B concreta dos decisiones ya tomadas en los ADR 0008 (proxy) y 0009 (tramos y tiempos
manuales): falta fijar cómo se registran/corrigen los tiempos de un técnico sin cuenta y cómo se
valida que alguien actúe en nombre de un técnico, distinguiendo actor de sujeto.

## Decisión

**Tiempos manuales.** Los tramos manuales viven en `time_spans` con `origin = 'manual'`,
`subject_technician_id` (a quién se atribuyen) y autor (`recorded_by`). Se corrigen **anulando el
tramo anterior y registrando uno nuevo**: `time_span_void` marca `voided_at`/`voided_by` sin borrar
(historial), y los tramos anulados **no cuentan** en `ticket_time_net` ni en `ticket_time_by_kind`.
Cada alta y anulación escribe el evento `manual_time_recorded`, con el técnico sujeto cuando lo hay.
Permiso: `time.record_manual` (supervisor de su equipo; administrador general).

**Proxy del técnico.** Las RPC de acción del técnico (`ticket_start`, `ticket_attend`,
`ticket_pause`, `ticket_advance_pause`, `ticket_resume`, `ticket_recapture`) aceptan un sujeto
opcional `p_subject_technician_id`. Sin sujeto exigen el permiso directo de la acción; con sujeto
validan `act_on_behalf` (ámbito `all` = cualquiera; `team` = técnicos de sus equipos) **y** que el
técnico participe en el tiquet (la recaptura no lo exige, puede ocurrir antes de asignar). El evento
guarda actor (`auth.uid()`) y sujeto por separado. Las RPC siguen siendo `security definer` con
`search_path` fijo (ADR 0015).

**Interfaz.** Móvil primero: botones ≥ 44 px, acciones de un clic deshabilitadas mientras su
mutación está pendiente (evita dobles envíos si el usuario reintenta), selector "a nombre de" para
supervisor/admin y una sección de tiempos manuales en el detalle.

## Alternativas consideradas

- **Editar el tramo manual:** rompe la bitácora de solo agregar; se descartó por el ADR 0009.
- **Un `event_type` por acción proxeada:** ruido; el sujeto ya distingue el "a nombre de".
- **Validar el proxy solo con el permiso, sin participación:** permitiría atribuir a un técnico
  ajeno sin relación con el tiquet.

## Consecuencias

- El sujeto de un tramo manual y de un evento es rastreable; el actor nunca se pierde.
- Los tramos anulados permanecen por auditoría pero no inflan los indicadores.
- `ticket_advance_pause` no se expone aún en la interfaz; el backend ya admite proxy.
- El modo laboral de los tiempos se completa en la Fase 6.
