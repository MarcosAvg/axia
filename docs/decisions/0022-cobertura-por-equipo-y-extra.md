# 0022 — Cobertura por equipo, horas extra y festivos

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

En la instancia, el equipo de Mantenimiento tiene tres turnos que se solapan y cubren de 06:00 a
20:00; los demás equipos trabajan de 08:00 a 17:00, con excepciones. Los turnos van **por persona**
y pueden rotar. Además, aunque haya calendario, una persona puede venir a trabajar (tiempos extra,
festivos). En el ADR 0021 el tiempo laboral quedó como el recorte contra el calendario del equipo.

## Decisión

- **Cobertura por equipo.** Para los indicadores del tiquet, el tiempo laboral se mide contra la
  **cobertura** del equipo (la unión de sus turnos), no contra el turno de cada persona:
  Mantenimiento `06:00–20:00` y el resto `08:00–17:00`, de lunes a viernes. El solapamiento de
  turnos no afecta a la cobertura.
- **Turnos por persona y rotación fuera de alcance.** No se modela el turno individual ni su
  rotación; se miden por persona solo los conteos y el tiempo de participación/auxilio desde el
  historial.
- **Trabajo real siempre, en dos lecturas.** El trabajo se registra siempre; el calendario solo
  separa **en horario** (`_laboral`) de **fuera de horario** (`_extra = calendario − laboral`).
  Trabajar de noche, en fin de semana o en un festivo no se pierde: cuenta como extra. El modo
  calendario (24 h) sigue siendo el total real.
- **Festivos oficiales editables.** Se siembran los festivos oficiales de México (2026-2027) y
  pueden agregarse o quitarse desde la administración.

## Alternativas consideradas

- **Turno por persona con asignaciones en el tiempo:** fiel a la operación, pero no aporta a los
  indicadores del tiquet y multiplica el mantenimiento; queda como cambio futuro si se pide medir
  el esfuerzo por turno.
- **Un calendario con franjas solapadas para un mismo equipo:** duplicaría el tiempo (un tramo
  contaría dos veces); se evita usando la cobertura como una sola franja.

## Consecuencias

- El tiempo laboral refleja la cobertura de la organización, no la asistencia individual; el
  esfuerzo por persona se ve en participación/conteo y en el extra.
- **Pendiente:** la interfaz de administración de calendarios, turnos y festivos (hoy se configuran
  en la semilla). El control de festivos "agregar/quitar" se hace en esa UI.
- La comida se modela partiendo la franja del día en dos; un turno nocturno, con dos franjas.
