# Decisiones de arquitectura

Registro de decisiones (ADR). Cada archivo explica el contexto, la decisión y sus consecuencias.

## Estado

| Estado | Significado |
|---|---|
| Vigente | Describe el sistema actual |
| Parcial | Una parte sigue vigente y otra está pendiente |
| Sustituida | Reemplazada por otra decisión; se conserva como historia |

## Decisiones vigentes

| ADR | Tema |
|---|---|
| [0001](0001-vite-react-spa-con-react-compiler.md) | Vite + React + TypeScript |
| [0003](0003-recharts-en-lugar-de-echarts.md) | Recharts |
| [0004](0004-cola-offline-con-dexie.md) | Cola offline con Dexie |
| [0005](0005-modelo-de-bloqueos-dirigido-por-datos.md) | Bloqueos dirigidos por datos |
| [0006](0006-independencia-del-nucleo.md) | Independencia del núcleo |
| [0007](0007-solicitante-mixto.md) | Solicitante con o sin cuenta |
| [0008](0008-tecnicos-catalogo-y-proxy.md) | Técnicos de catálogo y proxy |
| [0009](0009-tiempos-tramos-y-manuales.md) | Tramos de tiempo y tiempos manuales |
| [0010](0010-roles-y-permisos-configurables.md) | Roles y permisos configurables |
| [0011](0011-motivos-jerarquicos.md) | Motivos jerárquicos |
| [0012](0012-folio.md) | Folio |
| [0013](0013-deteccion-duplicados-pg-trgm.md) | Duplicados con `pg_trgm` |
| [0014](0014-ofertas-de-ruteo.md) | Ofertas de ruteo |
| [0019](0019-evidencia-offline.md) | Evidencia offline |
| [0020](0020-tiempos-manuales-y-proxy.md) | Tiempos manuales y proxy |
| [0021](0021-tiempo-laboral-e-indicadores.md) | Tiempo laboral e indicadores |
| [0022](0022-cobertura-por-equipo-y-extra.md) | Cobertura por equipo y extra |
| [0023](0023-administracion-calendarios-y-zona.md) | Calendarios y zona horaria |
| [0024](0024-tablero-metricas.md) | Tablero de métricas |
| [0025](0025-fundacion-interfaz.md) | Fundación de interfaz |
| [0026](0026-duplicados-y-satisfaccion.md) | Duplicados y satisfacción |
| [0027](0027-tiempos-objetivo-sla.md) | Tiempos objetivo y SLA |
| [0028](0028-xlsx-y-progreso.md) | XLSX y progreso |
| [0031](0031-verificacion-metricas.md) | Verificación de métricas |
| [0035](0035-produccion-push-ci-capacitor.md) | Producción, push y CI |
| [0036](0036-proxy-a-eleccion.md) | Proxy a elección |
| [0038](0038-sistema-de-tokens-y-temas.md) | Tokens y temas |
| [0039](0039-armazon-de-navegacion.md) | Armazón de navegación |
| [0040](0040-componentes-de-datos.md) | Componentes de datos |
| [0041](0041-panel-de-inicio.md) | Panel de inicio |
| [0042](0042-operacion-lista-alta-detalle.md) | Operación: lista, alta y detalle |
| [0043](0043-semilla-con-nombres-legibles.md) | Semilla con nombres legibles |
| [0044](0044-evidencia-por-estado.md) | Evidencia por estado |
| [0045](0045-permisos-evidencia-y-acciones.md) | Permisos de evidencia y acciones |
| [0046](0046-rediseno-administracion.md) | Rediseño de administración |
| [0047](0047-metricas-acceso-perfil.md) | Métricas, acceso y perfil |
| [0048](0048-metricas-pestanas.md) | Pestañas de métricas |
| [0049](0049-metricas-filtros-servidor.md) | Filtros de métricas en servidor |
| [0050](0050-dimensiones-simultaneas.md) | Dimensiones simultáneas |
| [0051](0051-resumen-cantidades.md) | Resumen de cantidades |
| [0052](0052-panel-ampliado.md) | Panel ampliado |
| [0053](0053-participantes-integridad.md) | Integridad de participantes |
| [0054](0054-tomar-al-abrir.md) | Tomar al abrir |
| [0055](0055-visibilidad-solicitante.md) | Visibilidad del solicitante |
| [0056](0056-clasificacion-alta.md) | Clasificación en el alta |
| [0057](0057-rediseno-administracion.md) | Rediseño de administración |
| [0058](0058-admin-usuarios-ambitos-calendarios.md) | Usuarios, ámbitos y calendarios |
| [0060](0060-subestados-pausa-ui.md) | Subestados de pausa en la interfaz |
| [0061](0061-pausa-motivo-subestados.md) | Pausa por motivo y subestados |
| [0062](0062-pausa-subestados-cascada.md) | Subestados en cascada |
| [0063](0063-paleta-acentos.md) | Paleta de acentos |
| [0064](0064-tiempo-acumulado.md) | Tiempo promedio o acumulado |
| [0065](0065-enfasis-acciones-y-movil.md) | Énfasis de acciones y móvil |
| [0066](0066-administracion-red-seguridad.md) | Administración con red de seguridad |
| [0067](0067-base-de-datos-autoalojada.md) | Base de datos autoalojada |
| [0068](0068-operacion-postgresql.md) | Operación de PostgreSQL |
| [0069](0069-servidor-fastify-y-estaticos.md) | Servidor Fastify y estáticos |
| [0070](0070-autenticacion-local-y-sesiones.md) | Autenticación local y sesiones |
| [0071](0071-autorizacion-y-alcance.md) | Autorización y alcance |
| [0072](0072-evidencias-tus-sharp.md) | Evidencias con TUS y Sharp |
| [0073](0073-sse-y-notificaciones.md) | SSE y notificaciones |
| [0074](0074-sincronizacion-offline.md) | Sincronización offline |
| [0075](0075-instalacion-secretos-respaldos.md) | Instalación, secretos y respaldos |
| [0076](0076-semillas-referencia-y-demo.md) | Semillas de referencia y demo |
| [0077](0077-pruebas-postgresql-real.md) | Pruebas contra PostgreSQL real |
| [0078](0078-corte-final-frontend.md) | Corte final del frontend |
| [0079](0079-navegacion-por-capacidad.md) | Navegación por capacidad y permisos |
| [0081](0081-hora-por-accion.md) | Hora por acción y ajuste auditado |
| [0082](0082-pruebas-por-cambio.md) | Pruebas por cambio y compuerta por niveles |

## Archivo

Decisiones sustituidas o deshabilitadas. Se conservan para explicar la historia y no deben tomarse
como guía de implementación.

| ADR | Motivo |
|---|---|
| [0002](archivo/0002-stack-anterior.md) | Stack anterior, sustituido por 0067, 0068, 0070 y 0078 |
| [0015](archivo/0015-rpc-definer-y-rls-de-lectura.md) | RPC y RLS sustituidos por la autorización del servidor |
| [0016](archivo/0016-autenticacion-anterior.md) | Autenticación anterior, sustituida por 0070 |
| [0017](archivo/0017-evidencias-en-storage.md) | Evidencias anteriores, sustituidas por 0072 |
| [0018](archivo/0018-escritura-administracion-por-rls.md) | Escritura administrativa por RLS sustituida por servicios |
| [0029](archivo/0029-infraestructura-importacion.md) | Importación deshabilitada |
| [0030](archivo/0030-adaptador-importacion.md) | Importación deshabilitada |
| [0032](archivo/0032-despliegue-y-respaldos.md) | Despliegue anterior, sustituido por 0075 |
| [0033](archivo/0033-linea-de-tiempo-importada.md) | Importación deshabilitada |
| [0034](archivo/0034-convivencia.md) | Importación deshabilitada |
| [0037](archivo/0037-app-docker-compose.md) | Compose anterior, sustituido por 0075 y 0078 |
| [0059](archivo/0059-importar-catalogos.md) | Importación de catálogos deshabilitada |
