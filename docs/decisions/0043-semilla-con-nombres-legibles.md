# 0043 — Semilla con nombres legibles

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

Los datos de demostración (la semilla anterior) llevaban el sufijo `(ejemplo)` en cada nombre
(catálogos, personas, motivos y descripciones) y usaban nombres como `Admin Demo`. Servía para no
chocar con los datos de las pruebas, pero hacía que la aplicación se viera artificial.

## Decisión

- La semilla usa **nombres normales de lectura humana**, sin sufijos ni identificadores: equipos,
  edificios, categorías, servicios, prioridades, canales, personas y motivos se nombran como en
  la operación real (p. ej. `Mantenimiento`, `Edificio Central`, `Eléctrico`, `Luis Gómez`,
  `Falta de material`). Las descripciones de los tiquets de demostración tampoco llevan sufijo.
- Los usuarios demo pasan a tener **nombres de persona**: `Rosa Delgado` (admin), `Sergio Ramírez`
  (supervisor), `Luis Gómez` (técnico) y `Ana Pérez` (solicitante). Los correos no cambian.
- Las **pruebas pgTAP** dejan de usar los mismos nombres genéricos: sus datos usan un juego neutro
  y distinto (`Equipo Alfa`, `Categoría Alfa`, `Servicio Alfa`, `Prioridad Alfa`, `Canal Alfa`,
  `Dependencia Alfa`, `Solicitante Alfa`, `Técnico Alfa`, `Nivel A`, `Motivo de prueba`, …). Así
  la semilla y las pruebas no comparten claves únicas (los catálogos tienen `name` único).
- Los e2e se actualizan a las etiquetas y saludos nuevos.

## Alternativas consideradas

- **Que las pruebas reutilicen los catálogos de la semilla:** menos líneas, pero acopla las pruebas
  a los datos de demostración.
- **Mantener el sufijo `(ejemplo)`:** descartado por petición explícita de la persona.

## Consecuencias

- La aplicación se ve real al evaluar la interfaz con datos de demostración.
- La semilla y las pruebas quedan desacopladas: cambiar un nombre de la semilla no afecta las
  pruebas, y viceversa.
- Cualquier catálogo nuevo en la semilla debe evitar los nombres reservados por las pruebas
  (documentados en este ADR).
