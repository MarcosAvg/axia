# Axia

[![CI de main](https://github.com/MarcosAvg/axia/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/MarcosAvg/axia/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)

Axia es una aplicación de código abierto y autoalojable para gestionar tiquets de mantenimiento.
Muestra quién atiende cada tiquet, qué lo detiene y cuánto tiempo lleva en cada etapa, con un
historial de acciones y evidencias.

**Para instalar**, descargar el paquete de la [última versión estable][release] y seguir la
[guía de instalación](deploy/README.md). El paquete incluye la configuración de Docker Compose,
los scripts operativos y el manual para actualizar y recuperar una instancia.

## Guías por tarea

| Tarea | Guía |
|---|---|
| Registrar y atender tiquets | [Uso](docs/guides/uso.md) |
| Gestionar usuarios, permisos y catálogos | [Administración](docs/guides/administracion.md) |
| Actualizar, respaldar o recuperar una instancia | [Operación](docs/guides/operacion.md) |
| Probar la demo o preparar el entorno local | [Desarrollo](docs/start/desarrollo.md) |
| Consultar la arquitectura, la API y las reglas de negocio | [Índice de documentación](docs/README.md) |

## Qué incluye

- Ciclo de atención desde el registro hasta la validación, con asignaciones, pausas y reclamaciones.
- Acceso por roles y permisos, bitácora de acciones, evidencias privadas y adjuntos.
- Aplicación web instalable en escritorio y móvil. Los técnicos pueden guardar acciones y
  evidencias sin conexión para sincronizarlas al volver a estar en línea.
- Panel por rol, métricas de atención, catálogos en XLSX y [avisos](docs/guides/uso.md#avisos) en la bandeja y por Web Push.

Las capacidades pendientes están en [límites y pendientes](docs/reference/limitaciones.md).

## Cómo se aloja

Docker Compose ejecuta Fastify y PostgreSQL 17 en un host Linux. Fastify sirve la web y la API,
PostgreSQL conserva los datos y un volumen separado guarda las evidencias y los adjuntos.
El operador publica la instancia mediante un proxy HTTPS. La imagen publicada incluye la web
compilada y aplica las migraciones al arrancar. El paquete permite usar el canal estable
`latest` o fijar una imagen por digest. [Arquitectura](docs/concepts/arquitectura.md)

## Contribuir

El entorno y las pruebas están en [desarrollo](docs/start/desarrollo.md); el flujo de cambios,
en [CONTRIBUTING](CONTRIBUTING.md). También aplican el [código de conducta](CODE_OF_CONDUCT.md),
la [política de seguridad](SECURITY.md) y la licencia [MIT](LICENSE).

[release]: https://github.com/MarcosAvg/axia/releases/latest
