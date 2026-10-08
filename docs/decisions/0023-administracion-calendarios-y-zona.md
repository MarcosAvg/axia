# 0023 — Administración de calendarios y zona horaria en la pantalla

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

El ADR 0022 dejó el tiempo laboral como cobertura por equipo, pero los calendarios vivían solo en
la semilla (`db:reset`), sin forma de administrarlos, y las fechas de la interfaz se mostraban en la
zona del dispositivo. La persona pidió poder controlar el calendario (agregar/quitar) y ver las
fechas siempre en la zona de la institución.

## Decisión

- **Escritura por RLS.** Los calendarios se administran con el permiso `catalog.manage` (sin permiso
  nuevo). `work_calendars` admite `insert`/`update` (nunca `delete`: se desactiva con `active`);
  `work_calendar_intervals` y `work_calendar_holidays` admiten también `delete` por ser tablas de
  relación. Mismo patrón del ADR 0018.
- **Pantalla de administración.** Nueva ruta `/admin/calendarios` con la lista de calendarios, alta y
  edición (nombre, zona horaria, activo), franjas semanales (varias por día, para comida y turno
  nocturno) y festivos (agregar/quitar). El calendario de cada equipo se elige en el catálogo de
  equipos y el calendario por defecto en la configuración.
- **Zona horaria de la institución.** `me()` devuelve `timezone` (de `instance_settings`) y la
  identidad lo lleva; los formateadores de fecha usan esa zona (`setDisplayTimezone`) en lugar de la
  del dispositivo. Si la configuración cambia, el proveedor de autenticación la vuelve a fijar.

## Alternativas consideradas

- **Permiso nuevo `schedule.manage`:** innecesario; los calendarios son catálogos y su administrador
  es el mismo. Se reutiliza `catalog.manage`.
- **Fecha con zona del dispositivo:** simple, pero muestra horas distintas según el equipo del
  usuario; se descartó por consistencia operativa.

## Consecuencias

- La persona controla calendarios, franjas y festivos sin tocar la semilla.
- Las fechas se ven iguales para todos, en la zona de la institución.
- Queda pendiente asociar la zona horaria a la **presentación de cada calendario** si algún equipo
  estuviera en otra zona (hoy todos comparten la de la instancia).
