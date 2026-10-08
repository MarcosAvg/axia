# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto se adhiere
a [Versionado semántico](https://semver.org/lang/es/).

## [0.0.0] - 2026-10-08

### Añadido

- **Núcleo de datos:** catálogos, motivos jerárquicos, roles y permisos configurables, tiquets con
  folio e historial, ruteo con ofertas, pausas, recaptura, reclamaciones, duplicados, tramos de
  tiempo, notificaciones, RLS de lectura y vistas base de indicadores.
- **Autenticación:** inicio de sesión sin auto-registro, perfil automático, RPC `me()` y layout con
  rutas protegidas por permiso.
- **Operación:** alta con aviso de duplicados, lista con filtros y paginación, detalle con línea de
  tiempo, bandeja del supervisor y vista del técnico con evidencias.
- **Administración:** catálogos y motivos, roles y permisos, usuarios, ámbitos y designaciones,
  calendarios y configuración de la instancia.
- **Sin conexión:** PWA instalable con Dexie, evidencias comprimidas y subida reanudable, y acciones
  del tiquet encoladas.
- **Indicadores:** tiempo laboral por cobertura de equipo, tablero de métricas con SLA, duplicados y
  satisfacción, y exportación CSV/XLSX.
- **Importación:** infraestructura genérica, adaptador CSV/Excel con simulación, importación
  idempotente, reconstrucción de la línea de tiempo y convivencia con el sistema de origen.
- **Despliegue:** Docker Compose de la aplicación con configuración en runtime, imágenes publicables,
  respaldos y contrato de reverse proxy.
