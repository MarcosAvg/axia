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

Los textos originales de 0001–0098 están en [Git](../history/README.md); sus números no se
reutilizan. Las referencias actuales incorporan sus criterios conservados y sustituyen detalles
que ya no corresponden al código. Una decisión nueva explica una alternativa relevante, el motivo
de elegirla y sus consecuencias duraderas; correcciones y resultados de pruebas van en CHANGELOG.
