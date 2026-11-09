# Axia

[![CI](https://github.com/MarcosAvg/axia/actions/workflows/ci.yml/badge.svg)](https://github.com/MarcosAvg/axia/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)

Axia permite seguir tiquets de mantenimiento: quién los atiende, en qué estado están y por qué
se detienen, con evidencias y tiempos. Es multiusuario, autoalojable y de código abierto, con
interfaz web para escritorio y móvil y trabajo sin conexión para técnicos.

## Empezar

| Necesidad | Guía |
|---|---|
| Instalar una instancia | [Instalación con Docker](deploy/README.md) |
| Usar Axia | [Guía de uso](docs/guides/uso.md) |
| Configurar usuarios y catálogos | [Administración](docs/guides/administracion.md) |
| Actualizar, respaldar o recuperar | [Operación](docs/guides/operacion.md) |
| Preparar el desarrollo local o la demo | [Desarrollo](docs/start/desarrollo.md) |
| Consultar documentación técnica | [Índice](docs/README.md) |

## Qué incluye

- Registro, asignación, ejecución, pausas, validación y reclamaciones de tiquets.
- Roles y permisos, historial de cambios y evidencias privadas.
- Cola offline de acciones y fotografías, con sincronización al recuperar la conexión.
- Panel, indicadores, notificaciones dentro de la aplicación y catálogos XLSX.

Web Push y escalamiento automático no están implementados. Los límites conocidos y el trabajo
pendiente están en [límites y pendientes](docs/reference/limitaciones.md).

## Cómo se aloja

Un servidor Fastify sirve la API y la web; PostgreSQL 17 conserva los datos y otro volumen las
fotos. Compose separa base y aplicación; la app aplica las migraciones pendientes antes de
arrancar. La instalación usa `latest` por defecto o una versión fijada, y un proxy HTTPS del
operador; no requiere Node.js ni compilar en el servidor.

El núcleo funciona de forma autónoma. La [arquitectura](docs/concepts/arquitectura.md)
explica el stack, la autorización y las decisiones técnicas.

## Contribuir

El entorno y las pruebas están en [desarrollo](docs/start/desarrollo.md); el flujo de cambios,
en [CONTRIBUTING](CONTRIBUTING.md). También aplican el [código de conducta](CODE_OF_CONDUCT.md),
la [política de seguridad](SECURITY.md) y la licencia [MIT](LICENSE).
