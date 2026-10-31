# Consolidación interna Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development task-by-task. Track steps with checkboxes.

**Goal:** Eliminar representaciones repetidas y corregir las divergencias de alcance, contrato y sincronización señaladas en el análisis aprobado.
**Architecture:** Conservar servidor único, SQL versionado, Drizzle para SQL/transacciones, features web y cola Dexie. Consolidar fronteras existentes sin un framework nuevo ni paquete compartido prematuro.
**Tech Stack:** TypeScript, Zod 4, Drizzle, Fastify, React, Dexie, Vitest, PostgreSQL 17 y Node 24.
**Spec:** Alcance aprobado en la conversación: contratos actuales, alcance único, retirar esquema no consumido, comandos tipados, bloqueo offline por tiquet, herramientas simples y documentación canónica. Reglas en [negocio](../../concepts/negocio.md) y [convenciones](../../reference/convenciones-codigo.md).

## Global Constraints

- No dependencias nuevas, producción ni lectura de secretos reales.
- No editar migraciones integradas, eliminar garantías SQL ni debilitar pruebas.
- Mantener permisos específicos de cada ruta; no equiparar `ticket.view` con `metrics.view`.
- Toda acción conserva UUID, tiempo y contexto; un reintento no inventa otro comando.
- Evidencias previas se procesan antes de las acciones que las requieren.
- La aprobación de implementación y la autonomía de AGENTS.md sustituyen otra ronda de preguntas técnicas.

## Review Focus

- Un alcance vacío o filtro fuera del alcance nunca amplía resultados.
- Un DTO incorrecto debe fallar en la frontera HTTP; no convertirse en un objeto aparentemente válido.
- Una acción con argumentos incompletos no debe transformarse silenciosamente en cadenas vacías.
- Un fallo de una acción/evidencia bloquea dependientes del mismo tiquet sin detener otros tiquets.
- Verificadores no leen dotenv privados, claves, backups, evidencias ni symlinks fuera de fuentes.

### Task 1: Contratos HTTP y comandos de web

**Files:** features/tickets/{schemas,api,hooks} y pruebas/callers necesarios; lib/api-client si se requiere una frontera con parser.
**Interfaces:** `TicketCommand` discrimina `operation` y `args`; el envío inmediato y la cola conservan esa forma. Mantener el transporte HTTP y formatos públicos del servidor.

- [x] Reproducir contratos antiguos no usados y argumentos incompletos con pruebas de DTO actual.
- [x] Validar lista/detalle/timeline/rating reales; reemplazar pruebas antiguas explicándolo en ADR.
- [x] Quitar registro de conversiones y wrappers redundantes, conservando tipos de argumentos en hooks.
- [x] Ejecutar pruebas web relacionadas, tipos y lint; commit con documentación al integrar.

### Task 2: Alcance único en métricas

**Files:** server/src/metrics y tickets/scope si hace falta; test/db de métricas/permisos; SQL nuevo solo si es imprescindible.
**Interfaces:** Cada endpoint conserva su permiso; alcance y filtros se intersectan antes de agregar. Mantener respuesta HTTP existente y fechas actuales fuera de esta tarea.

- [x] Escribir y observar fallar pruebas de equipos A+B filtrados por A, edificios vacíos y filtros fuera de alcance.
- [x] Consolidar autorización con `scopePredicate(actor, permission)` y acotar antes de agregar.
- [x] Evitar duplicados/sumas repetidas y conservar resultados de cada métrica para administrador.
- [x] Ejecutar integración positiva/negativa con PostgreSQL exclusivo de pruebas y registrar decisiones.

### Task 3: Herramientas de fuentes y planificador de pruebas

**Files:** scripts/check-agnostic.mjs, scripts/check-docs.mjs si procede, scripts/test-affected.mjs y pruebas; pequeños módulos de fuentes/planificación.
**Interfaces:** Planificador puro devuelve comandos a partir de archivos; CLI descubre Git y ejecuta. Fuentes limitadas a archivos versionados/nuevos no ignorados y sin secretos/symlinks.

- [x] Regresiones de env privado, datos ignorados y symlinks; observar RED antes del arreglo.
- [x] Aplicar inventario seguro sin leer archivos excluidos y conservar detección de nombres prohibidos.
- [x] Sustituir VM/manipulación textual de tests por pruebas directas del planificador.
- [x] Conservar regresiones de workflows/Compose/lock/borrados/estilos/rutas/error; ejecutar Node tests.

### Task 4: Secuencia offline y esquema sin uso

**Files:** web/lib/offline/{outbox,db} y features/tickets/api/offline-actions; pruebas de outbox/sync; server/src/db/client.ts y schema.ts; referencias de esquema.
**Interfaces:** Preservar API pública de outbox y blobs pendientes. Agrupar/bloquear por `ticketId` sin romper orden de evidencias; nuevos estados deben ser compatibles con filas guardadas.

- [x] Reproducir fallo de acción A seguido de B del mismo tiquet y C de otro, más fallo de evidencia previa.
- [x] No enviar B hasta resolver A; permitir C; mostrar/reintentar dependencias y conservar aislamiento de usuario.
- [x] Eliminar import/copia de schema.ts solo tras verificar ausencia de consumidores; conservar Drizzle SQL y tipos reales de repositorios.
- [x] Ejecutar pruebas offline, tipos, lint e integración del servidor; no cambiar SQL por limpieza de TypeScript.

### Task 5: Documentación, revisión y cierre

**Files:** docs/concepts/dominio.md, docs/reference/convenciones-codigo.md y referencias afectadas, ADR 0100, CHANGELOG.md y estado.md.

- [x] Corregir RPC histórica, comandos de pruebas y fuente canónica del esquema; documentar sustitución de parsers/pruebas.
- [x] Ejecutar `pnpm check:fast` y subconjuntos durante el ciclo.
- [x] Pedir revisión independiente, corregir con regresiones y ejecutar `pnpm test:affected` → compuerta completa una vez al cierre.
- [x] Preparar integración local solo con checks verdes, sin push ni despliegue; registrar límites y evidencia.

## Ledger

- Inicio: checkout limpio en `c4eb2e9`; continuar en rama propia sin duplicar el entorno existente.
- Autorización: implementar los siete puntos del análisis; no incluir cambios de reglas de negocio ajenos.
- Pre-flight: frontend y offline comparten `TicketCommand`; coordinar su export sin editar simultáneamente el mismo archivo.
- Pre-flight: métricas cambia código servidor; no ejecutar simultáneamente integración que reconstruye `axia_test`.

- Cierre: check:fast verde; test:affected seleccionó check completo y la ejecución final terminó con código 0 (46 Node, 57 servidor, 298 web, 52 E2E, 231 PostgreSQL).
- Revisión independiente cerrada: ignorados forzados al índice excluidos antes de stat/lectura; regresiones RED→GREEN en ambos scanners.
- Regresiones adicionales: cambio de sesión durante resolución de fila antigua y preparación del envío; cola pendiente preservada sin envío ni intentos consumidos.
- Límite documentado: coordinación entre pestañas y acciones disponibles del servidor no forman parte de esta consolidación; persiste aviso previo de chunks >500 kB.
