# 0102 — Documentación actual organizada por tareas

**Fecha:** 2026-10-31
**Estado:** aceptada

## Decisión

El README presenta Axia y sus entradas principales; `docs/README.md` orienta según lo que se
necesita hacer. Cada tema tiene un documento canónico y el resto enlaza a él.

| Necesidad | Referencia canónica |
|---|---|
| Instalar una instancia | `deploy/README.md`, incluido en el paquete operativo |
| Actualizar, respaldar y recuperar | `docs/guides/operacion.md`, incluido en el paquete |
| Preparar desarrollo y pruebas | `docs/start/desarrollo.md` |
| Usar o administrar | Guías de uso y administración |
| Consultar reglas aprobadas | `docs/concepts/negocio.md`, sin cambios de contenido |
| Entender términos, componentes y datos | Dominio/glosario, arquitectura y datos |
| Consultar contratos | Referencias de API, permisos, estados, comandos y configuración |
| Contribuir y mantener calidad | CONTRIBUTING y convenciones; AGENTS añade instrucciones del agente |

Se fusionan instalación local y continuidad en desarrollo; la instalación de producción tiene
una sola secuencia en `deploy/README.md`. Los documentos mantienen sus rutas salvo esas fusiones.
Se consolidan los criterios técnicos de decisiones 0001–0098 en referencias actuales y sus textos
fechados se conservan en Git (`2455a48`); el índice histórico explica cómo consultarlos. Se mantienen
0099–0102 como decisiones de consolidación actuales. Los números retirados no se reutilizan.

## Criterios

La limpieza anterior separó historia explícita, pero todavía dejaba procedimientos repetidos,
resúmenes contradictorios y decenas de decisiones de etapas anteriores en el recorrido habitual.
Mantenerlos con más avisos conserva el coste de buscar y reconciliar instrucciones. Reunir todo
en un manual único dificultaría mantener configuración, contratos y tareas por separado.

Se conservan archivos Markdown, el verificador y el paquete existentes, sin sitio ni herramienta
nueva. Se documenta el comportamiento observable del código y sus límites; una capacidad futura
no se presenta como disponible. Se enlazan reglas y tablas canónicas en lugar de copiarlas.
No se modifican negocio, autorización, comandos, configuración ni garantías para ajustar la prosa.

## Mantenimiento

Un cambio de comportamiento actualiza su referencia en el mismo commit. Antes de añadir un
documento se comprueba si corresponde ampliar uno existente. Las decisiones nuevas requieren
una alternativa técnica relevante y consecuencias duraderas; correcciones, recuentos de pruebas
y detalles de interfaz se registran en CHANGELOG o en la memoria de trabajo, no en otro ADR.
Los planes concluidos se consultan en Git. Estado contiene solo trabajo actual, comprobación
reciente, límites y pendientes; no duplica un historial cronológico.
