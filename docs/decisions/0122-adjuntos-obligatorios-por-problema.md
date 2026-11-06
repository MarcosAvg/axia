# 0122 — Adjuntos obligatorios por problema

**Fecha:** 2026-11-06
**Estado:** aceptada

## Decisión

Algunos problemas exigen, al registrar el tiquet, un documento que no es una evidencia. La regla se
configura por problema con una lista de tipos MIME permitidos (PDF, JPEG, PNG, WebP, DOCX y XLSX) y
una instrucción opcional.

El adjunto se guarda en `ticket_attachments`, una tabla separada de `evidence`. Nunca satisface
`before`, `after` ni `claim`, no cuenta en los indicadores de evidencia y no se mezcla con sus
conteos.

La subida usa un TUS propio (`/api/attachment-uploads`) y un área de preparación. El alta envía
`attachmentId` y el servidor verifica y liga el archivo en la misma transacción que crea el tiquet.
Si falta, no está listo, pertenece a otra persona o su tipo no corresponde, el alta responde `422` y
no se crea nada. La recaptura aplica la misma regla cuando cambia a un problema que la exige.

El contenido se verifica con `file-type`; el tipo declarado por el cliente no se acepta como
verdad. La descarga exige sesión y visibilidad del tiquet, se sirve como `attachment` y con
`nosniff`. Los tiquets históricos no se bloquean retroactivamente y los derivados de una reclamación
quedan exentos.

## Alternativas y consecuencias

Se descartó crear el tiquet antes de subir el archivo: deja una ventana en la que existe un tiquet
que incumple la regla y no cumple el requisito de "al crear". También se descartó enviar el archivo
en una petición multipart: rompe TUS, la reanudación y los límites de tamaño existentes.

El coste es una preparación que puede quedar abandonada; se limpia con
`pnpm db:cleanup-attachments`, sin borrar adjuntos ligados. DOCX/XLSX añaden la dependencia
`file-type` (MIT, mantenida, Node ≥22) para reconocer OOXML y limitar el consumo de los ZIP.

Las variantes con macros se detectan como su tipo base. Axia no abre ni ejecuta el archivo; el
riesgo queda en el cliente que lo descargue. Los adjuntos ligados son historial y no se pueden
borrar desde la aplicación ni por TUS.

## Reversión

La migración es aditiva. Para dejar de exigir adjuntos basta con vaciar los tipos del problema en
administración. Revertir el código deja tablas y archivos huérfanos pero inofensivos; no hay
relleno retroactivo ni bloqueo de tiquets existentes.
