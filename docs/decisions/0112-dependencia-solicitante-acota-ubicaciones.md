# 0112 — La dependencia del solicitante acota las ubicaciones

**Fecha:** 2026-11-04
**Estado:** aceptada

## Decisión

El alta de tiquet usa el **solicitante efectivo** para acotar el lugar: el solicitante propio
cuando la persona registra su tiquet, o el solicitante elegido cuando se registra a nombre de otra
persona. Si ese solicitante tiene dependencia, la dependencia queda fija y solo se ofrecen los
edificios con ubicaciones vinculadas a ella y esas ubicaciones. Si no tiene dependencia, se conserva
el flujo anterior: todos los edificios, ubicaciones por edificio y dependencia por ubicación.

La regla se aplica en la interfaz y en el servidor. El alta rechaza una dependencia distinta a la
del solicitante y una ubicación que no esté vinculada a ella. La recaptura usa la dependencia del
solicitante del tiquet y solo valida cuando el cambio incluye edificio, ubicación o dependencia;
así, corregir solo textos de una captura histórica no se bloquea.

Los catálogos de lectura aceptan `dependencyId` para filtrar edificios y ubicaciones. El detalle del
tiquet expone `requesterDependencyId` y `requesterDependencyName` para que la recaptura muestre la
dependencia fija sin una consulta adicional.

## Alternativas y consecuencias

Se descartó filtrar solo en la interfaz: un cliente podía enviar una combinación válida para la API
pero ajena a la dependencia del solicitante, y la regla habría quedado sin efecto fuera de la web.

Se descartó un endpoint compuesto que devolviera edificios y ubicaciones en una sola llamada:
creaba un contrato nuevo para un caso que ya se resuelve con el patrón `buildingId` de los catálogos.

No hay migración de esquema ni reescritura de tiquets históricos. Un tiquet cuya dependencia guardada
no coincida con la del solicitante puede corregirse solo de texto; para cambiar el lugar, la
recaptura ajusta la dependencia a la del solicitante y exige una ubicación vinculada.

La contrapartida es que quien registra a nombre de otra persona debe elegir primero al solicitante;
los campos de lugar quedan deshabilitados hasta entonces. Las altas encoladas antes del cambio con
una dependencia distinta a la del solicitante pueden fallar al sincronizar y deben corregirse en la
cola de salida.
