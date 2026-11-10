# 0125 — Tiempo autoritativo de la instancia, confianza y corrección manual

**Fecha:** 2026-11-10
**Estado:** aceptada e implementada.

## Contexto

Axia mide el ciclo de un tiquet con dos relojes que no siempre coinciden. Las acciones en línea
pueden sellarse con la hora del servidor, pero las acciones sin conexión llegan con la hora del
dispositivo y las tablas de negocio usan `now()` del servidor. Esa mezcla produce duraciones
negativas, pausas con tiempos de sincronización y participaciones que terminan después del cierre.

La instancia ya tiene una zona horaria configurable (`instance_settings.timezone`, semilla
`America/Mexico_City`) para evitar discrepancias de presentación y de calendario. La hora de una
acción, en cambio, no tenía una política única: el cliente podía enviar `occurredAt`, el servidor
usaba `new Date()` o `now()` según el camino, y la hora manual se interpretaba con la zona del
navegador.

## Decisión

1. **Acción en línea: `now()` de PostgreSQL en la transacción.** No se usa `new Date()` de Node ni
   la hora del dispositivo para sellar una acción en línea. Todas las escrituras de la acción
   comparten el mismo instante transaccional.
2. **Acción offline: hora del dispositivo, con control de desfase.** El cliente envía
   `clientReportedAt` y, en el lote de sincronización, `deviceNow`. El servidor calcula
   `clockSkew = deviceNow - now()` y decide la confianza del evento. La duración del trabajo sin
   conexión no se confunde con el desfase: se compara el reloj actual del dispositivo, no la hora
   de la acción.
3. **Confianza explícita.** Cada evento, tramo y evidencia guarda `time_confidence`:
   - `trusted`: acción en línea, manual, u offline con desfase dentro de
     `instance_settings.time_sync_tolerance` (semilla: 5 minutos) y orden coherente.
   - `unverified`: acción offline con desfase fuera de la tolerancia o sin `deviceNow`. Se aplica,
     se alerta y exige corrección manual antes de cerrar.
   - `corrected`: una persona con permiso ajustó la hora; la alerta se resuelve y los tramos se
     reconstruyen.
4. **Nunca se inserta un tiempo negativo o fuera de orden.** Si `clientReportedAt` es anterior al
   último evento del tiquet, está demasiado en el futuro o excede la antigüedad máxima, el lote
   devuelve `rejected` con `time_out_of_order`, `time_future` o `time_too_old`. El ítem permanece
   en la cola para que la persona fije una hora manual y reintente. No se corrige con un `greatest`
   silencioso.
5. **La corrección manual es obligatoria.** Un evento `unverified` crea una fila en
   `ticket_time_alerts`. Mientras el tiquet tenga alertas abiertas, no puede pasar a un estado final
   (`validate`, `reject`, `cancel`, `mark_duplicate` o `resolve_claim`). El servidor responde 409
   con las alertas y una hora sugerida. Las acciones que no cierran el tiquet siguen permitidas.
6. **La hora manual se captura como hora de pared de la instancia.** El cliente envía
   `occurredLocal` (`YYYY-MM-DDTHH:mm`), no un ISO construido con la zona del navegador. El servidor
   la interpreta con `AT TIME ZONE instance_settings.timezone`, comprueba el round-trip para
   rechazar horas inexistentes en el cambio de horario y valida contra `now()` de la base.
7. **Todas las escrituras de una acción usan el mismo instante.** Eventos, tramos, pausas, pasos,
   asignaciones, participaciones, validaciones, reclamaciones y ofertas. Si la acción es manual,
   todas usan la hora manual; si no, todas usan la hora del evento.
8. **Cualquier evento puede ajustarse.** El endpoint de ajuste acepta cualquier evento del tiquet,
   salvo los de auditoría `event_time_corrected`. El ajuste es atómico: evento, `closed_at`, tramos,
   filas enlazadas y alertas.
9. **Fase `dormant`.** El tiempo entre un estado terminal y una reclamación o reactivación se
   registra como `dormant`: cubre la línea de tiempo, pero queda fuera de los indicadores de
   desempeño. No infla “reclamación” ni “espera”.
10. **El histórico se congela.** `clock_class` y `work_calendar_id` se copian al evento/tramo.
    Cambiar un motivo o un calendario después no reescribe el pasado.

## Alternativas descartadas

- **Sellar toda acción offline con la hora de sincronización.** Es simple, pero pierde la hora real
  del trabajo y hace inútil el registro de tiempos offline.
- **Confiar siempre en el dispositivo.** Permite los valores negativos y los desfases que motivan
  esta decisión.
- **Corregir automáticamente por el offset medido.** Oculta el error, atribuye una precisión que no
  existe y deja al operador sin la decisión de corregir.

## Consecuencias

- La hora offline es provisional hasta que se corrige o se confirma que el reloj era confiable.
- El cierre puede bloquearse hasta que se corrijan las alertas. Es una decisión deliberada: el
  tiempo no confiable no debe entrar en SLA, resolución ni carga de trabajo.
- Un cliente que no envíe `deviceNow` queda `unverified` y bloquea el cierre. La compatibilidad se
  resuelve actualizando el cliente, no relajando la confianza.
- Los eventos históricos no se reescriben. La auditoría reporta el desfase y la cobertura; lo que
  puede demostrarse se repara.
- La zona de la instancia se usa para interpretar horas de pared y para filtrar por día o mes; el
  instante sigue guardado como `timestamptz`.

## Implementación

La política se implementó en el registro de tiempos: confianza, alertas y corrección manual;
escritura de las tablas de negocio con el mismo instante; enlaces de evento; ajuste atómico;
pausas y reapertura; evidencia con ciclo; calendario y `clock_class` congelados; zona de la
instancia y universo de indicadores. La migración `0050_time_backfill.sql` repara y reconstruye el
histórico demostrable; no reescribe horas ni convierte alertas reales en `trusted`.

## Reversión

Desactivar el bloqueo de desenlaces finales y marcar todos los eventos como `trusted`; el coste es
volver a admitir duraciones negativas y tiempos de dispositivo sin control. No se edita una
migración ya integrada: la reversión se hace con una migración nueva y un ADR que sustituya este.
