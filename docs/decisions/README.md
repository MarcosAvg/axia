# Decisiones de arquitectura

Las referencias actuales explican cómo funciona Axia: [arquitectura](../concepts/arquitectura.md),
[datos](../concepts/datos.md) y [convenciones](../reference/convenciones-codigo.md).
Este índice conserva las decisiones de consolidación que justifican sus límites.

| ADR | Decisión |
|---|---|
| [0099](0099-consolidacion-self-hosted.md) | Entornos, imagen única y recuperación coordinada |
| [0100](0100-consolidacion-interna.md) | Contratos, alcance SQL y dependencias offline |
| [0101](0101-retirada-historica.md) | Retirada segura de objetos y documentación sin vigencia |
| [0102](0102-documentacion-por-tareas.md) | Documentación canónica organizada por tareas |
| [0103](0103-catalogos-operables-y-demo-coherente.md) | Catálogos sin pausas sin salida y demo con relaciones coherentes |
| [0104](0104-borrado-catalogos-sin-uso.md) | Borrado de catálogos solo cuando no tienen uso |
| [0105](0105-deteccion-revision-duplicados.md) | Detección ponderada y revisión de duplicados |
| [0106](0106-calificacion-modal-y-bloqueo-validacion.md) | Calificación en modal y bloqueo tras validar |
| [0107](0107-tomar-antes-de-actuar.md) | Tomar el tiquet antes de las acciones del supervisor |
| [0108](0108-atribucion-sujeto-proxy.md) | Tiempo y evidencia atribuidos al sujeto proxy |
| [0109](0109-asignacion-lider-auxiliar-y-reclamacion.md) | Asignación líder/auxiliar, titularidad y reclamación |
| [0110](0110-latest-y-migracion-en-arranque.md) | Canal `latest` y migración en el arranque de la app |
| [0111](0111-proxy-explicito-solicitante.md) | Proxy explícito del solicitante para validar, calificar, reclamar y cancelar |
| [0112](0112-dependencia-solicitante-acota-ubicaciones.md) | La dependencia del solicitante acota edificios y ubicaciones |
| [0113](0113-arranque-lectura-offline.md) | Arranque y lectura offline con caché de 7 días |
| [0114](0114-fases-exclusivas-y-desenlaces.md) | Fases exclusivas y desenlaces propios en las métricas |
| [0115](0115-rondas-de-oferta-y-sin-ruteo.md) | Rondas de oferta y aviso de ruteo sin salida |
| [0116](0116-proyeccion-local-acciones-offline.md) | Proyección local del estado con acciones offline pendientes |
| [0117](0117-orden-natural-portable.md) | Orden natural portable de listados de nombres |
| [0118](0118-ambito-deteccion-duplicados.md) | Ámbito de detección de duplicados por edificio, ubicación y dependencia |
| [0119](0119-react-compiler-y-formularios.md) | React Compiler y el registro de campos de React Hook Form |
| [0120](0120-avisos-diversos-y-badges.md) | Avisos diversos, texto enriquecido y badges de bandeja |
| [0121](0121-tableros-bandeja.md) | Tableros de solo lectura por bandeja |
| [0122](0122-adjuntos-obligatorios-por-problema.md) | Adjuntos obligatorios por problema |
| [0123](0123-validacion-dos-lados-misma-cuenta.md) | Validación de ambos lados por la misma cuenta |
| [0124](0124-retirada-referencias-externas.md) | Retiro de las referencias externas y la integración deshabilitada |

Los textos originales de 0001–0098 están en [Git](../history/README.md); sus números no se
reutilizan. Las referencias actuales incorporan sus criterios conservados y sustituyen detalles
que ya no corresponden al código. Una decisión nueva explica una alternativa relevante, el motivo
de elegirla y sus consecuencias duraderas; correcciones y resultados de pruebas van en CHANGELOG.
