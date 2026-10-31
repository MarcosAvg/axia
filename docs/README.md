# Documentación de Axia

Elegir la guía según la tarea. Cada tema tiene una referencia principal; los pasos de instalación,
las variables y las reglas no se repiten en varios manuales.

## Instalar y mantener una instancia

| Tarea | Documento |
|---|---|
| Instalar, conectar HTTPS y crear el primer administrador | [Instalación](../deploy/README.md) |
| Actualizar, respaldar, recuperar y mantener | [Operación](guides/operacion.md) |
| Consultar variables y valores predeterminados | [Configuración](reference/configuracion.md) |
| Diagnosticar PostgreSQL | [Rendimiento](reference/rendimiento-postgres.md) |

## Usar y administrar

| Tarea | Documento |
|---|---|
| Registrar y atender tiquets, adjuntar evidencia y trabajar offline | [Uso](guides/uso.md) |
| Gestionar usuarios, permisos, catálogos y calendarios | [Administración](guides/administracion.md) |
| Consultar avisos y capacidades de notificación | [Notificaciones](guides/notificaciones.md) |

## Desarrollar y contribuir

| Tarea | Documento |
|---|---|
| Preparar el entorno, demo, pruebas y resolver fallos locales | [Desarrollo](start/desarrollo.md) |
| Entregar un cambio | [Contribución](../CONTRIBUTING.md) |
| Aplicar estructura y estándares de código | [Convenciones](reference/convenciones-codigo.md) |
| Escribir documentación | [Criterios editoriales](reference/estilo-documentacion.md) |
| Consultar comandos | [Comandos](reference/comandos.md) |

## Entender el sistema

| Tema | Fuente principal |
|---|---|
| Reglas de negocio aprobadas | [Especificación](concepts/negocio.md) |
| Vocabulario y resumen del flujo | [Dominio](concepts/dominio.md) |
| Componentes y decisiones técnicas actuales | [Arquitectura](concepts/arquitectura.md) |
| Entidades y relaciones | [Datos](concepts/datos.md) |
| Acciones y estados | [Transiciones](reference/estados-y-transiciones.md) |
| Autorización | [Permisos](reference/permisos.md) |
| Rutas y contratos HTTP | [API](reference/api.md) |

## Mantenimiento de la documentación

La especificación expresa las reglas aprobadas; las guías describen la implementación disponible.
Una diferencia se registra como pendiente, sin alterar la regla ni afirmar que ya está resuelta.
El [estado](internal/estado.md) reúne trabajo actual y límites conocidos. Las [decisiones recientes](decisions/README.md)
explican consolidaciones vigentes; el [historial en Git](history/README.md) permite recuperar diseños
anteriores sin presentarlos como instrucciones actuales.
