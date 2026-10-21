# Changelog

Todos los cambios relevantes se documentan en este archivo. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa versionado semántico.

## [Unreleased]

### Añadido

- Stack propio con PostgreSQL 17, Drizzle, Fastify 5 y TypeScript.
- Autenticación local con usuario y contraseña, sesiones opacas, bloqueo por intentos y primer
  arranque.
- Autorización central por permisos y ámbitos, con repositorios de tiquets y respuestas opacas.
- API de tiquets: alta, ruteo, ofertas, asignación, inicio, pausa con subestados, atención,
  validación, rechazo, cancelación, prioridad, comentarios, duplicados, reactivación, recaptura,
  reclamaciones, reasignación, apoyo auxiliar y calificación.
- Evidencias con TUS, Sharp, normalización WebP, miniaturas, cuota y entrega autenticada.
- Tiempo real con `LISTEN/NOTIFY`, SSE, recuperación de eventos y bandeja in-app.
- Sincronización offline con cola Dexie, UUID de cliente, `occurredAt` y bloqueo de dependientes.
- Administración de usuarios, roles, catálogos, calendarios, ámbitos y configuración de instancia.
- Indicadores de tiempos, SLA, duplicados, satisfacción, carga por técnico y ruteo.
- Semilla de referencia en migraciones y semilla demo explícita, idempotente y sin contraseña fija.
- Instalación con secretos generados, Compose `db`/`migrate`/`app`, respaldos de base y evidencias.
- Documentación organizada por audiencia y verificación de enlaces con `pnpm check:docs`.

### Cambiado

- La PWA usa la API propia y el servidor sirve el SPA compilado.
- La compuerta de calidad usa PostgreSQL real, Vitest y Playwright.
- La documentación se reorganizó en inicio, guías, referencia, conceptos, decisiones e histórico.

### Retirado

- El runtime y las herramientas del stack anterior.
- La suite de pruebas ligada al esquema anterior; las invariantes se prueban contra PostgreSQL real.
- Las importaciones e integraciones externas quedan deshabilitadas en esta versión.

## [0.0.0] - 2026-10-21

Versión inicial en desarrollo.
