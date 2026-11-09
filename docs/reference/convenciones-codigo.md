# Convenciones de código

Reglas obligatorias para mantener Axia. La estructura y las decisiones se explican en
[arquitectura](../concepts/arquitectura.md); el negocio se define en la [especificación](../concepts/negocio.md).
Este documento reúne estándares de implementación, no otro manual de instalación.

## 1. Principios

Elegir la solución más simple y reversible que cumpla el requisito. Cada archivo y función tiene
un propósito concreto. La lógica de negocio vive en servicios del servidor y funciones puras;
la base conserva integridad y transacciones. No abstraer sin una repetición real ni añadir
frameworks para sustituir unas pocas operaciones claras.

## 2. Idioma y nombres

Código, SQL, valores y archivos en inglés; interfaz y documentación en español es-MX.
Usar nombres descriptivos, archivos `kebab-case`, tipos `PascalCase`, funciones/variables
`camelCase` y constantes `UPPER_SNAKE_CASE`. Booleanos con `is`, `has`, `can` o `should`.
Centralizar textos de interfaz en los diccionarios existentes; no incrustarlos en reglas de
negocio. Utilizar el [vocabulario del dominio](../concepts/dominio.md).

## 3. Estructura por funcionalidad

En `apps/web/src`, `routes/` compone páginas; `app/` configura proveedores/router y `lib/`
contiene infraestructura compartida. Cada `features/<feature>/` organiza `api/`, `components/`,
`hooks/`, `domain/`, esquemas y textos, con `index.ts` como entrada pública. No crear carpetas
vacías para cumplir una plantilla. Los componentes UI compartidos viven en `components/`.

El servidor organiza rutas, servicios y repositorios por dominio en `apps/server/src/`.
Las migraciones SQL viven en `apps/server/db/migrations/`.

## 4. Reglas de dependencia

- Una feature importa otra únicamente a través de su `index.ts`.
- `routes/` compone features y componentes; `components/` y `lib/` no importan features ni rutas.
- Solo `features/*/api` y `lib/` usan el cliente HTTP. Componentes, rutas y hooks de interfaz no
  llaman directamente a `/api`.
- `domain/` es TypeScript puro: no importa React, HTTP, TanStack ni Dexie. No hay ciclos.
- Los adaptadores externos quedan aislados; no añaden nombres, reglas o columnas de otro sistema
  al núcleo. Las referencias externas usan `ticket_external_refs` y `external_systems`.
- El verificador de independencia admite nombres externos únicamente en las excepciones
  históricas/internas, decisiones y scripts que define `scripts/check-agnostic.mjs`. Su lista de
  nombres está en `scripts/agnostic-names.json`; no se amplían excepciones para ocultar infracciones.

## 5. Límites de tamaño y complejidad

| Elemento | Límite |
|---|---|
| Archivo | 300 líneas, sin comentarios ni vacías |
| Función | 60 líneas |
| Componente | 150 líneas; dividir si crece |
| Parámetros | 4; utilizar objeto si hacen falta más |
| Anidación | 3 niveles |
| Complejidad ciclomática | 10 |

Dividir código en lugar de subir límites. Cualquier supresión de lint requiere justificación
escrita; no se desactivan reglas para conseguir que una comprobación pase.

## 6. TypeScript y fronteras

Mantener `strict`, `noUncheckedIndexedAccess` y `noFallthroughCasesInSwitch`. No utilizar `any`,
`@ts-ignore` ni conversiones `as` para forzar tipos; una excepción necesaria usa una explicación
y, cuando corresponda, `@ts-expect-error`. Preferir uniones literales y comandos discriminados.
Usar `type` para uniones e `interface` para objetos públicos; sin exportación por defecto salvo
requisito del framework.

Zod valida entradas del servidor, formularios, importaciones y DTO externos en sus fronteras.
Los repositorios tipan resultados SQL; la web no genera tipos desde la base. Dentro del dominio
se conserva la información de tipos, sin volver a convertir argumentos en registros genéricos.

## 7. React e interfaz

TanStack Query mantiene datos del servidor; no copiarlos a estado local. Centralizar claves de
consulta. Los filtros de listas, orden y paginación usan la URL. Evitar efectos para derivar datos;
la lógica de pantalla va en hooks y la lógica pura en dominio. Reservar estado global para sesión
y preferencias compartidas.

Toda pantalla maneja carga, vacío, error y datos; las listas grandes se paginan o virtualizan.
Formularios con React Hook Form y Zod, errores junto al campo, etiquetas, teclado, foco visible,
contraste, texto alternativo y objetivos táctiles de 44 px. Los componentes shadcn regenerables
solo se modifican con una necesidad justificada.

## 8. Cliente HTTP

Las lecturas y mutaciones tienen contratos explícitos. Los cambios de flujo se envían como acciones
del servidor o como sincronización; la web no actualiza columnas de estado. Mantener errores
interpretables para la interfaz y pedir únicamente datos paginados/filtrados que se necesiten.
Las rutas y formatos actuales están en [API](api.md).

## 9. Offline y evidencias

Las acciones offline conservan UUID del cliente, hora, argumentos y dueño. El reenvío es idempotente;
no se genera otro comando para reintentar. La cola mantiene dependencias de evidencia/acciones por
tiquet y no envía con la sesión de otra persona. Los conflictos definitivos se muestran para
revisión; no se descartan silenciosamente. El detalle del mecanismo y sus límites está en
[arquitectura](../concepts/arquitectura.md).

La sesión y el caché de consultas se guardan en el dispositivo con caducidad de 7 días y se borran
al cerrar sesión o ante un 401. Solo se persisten tiquets, catálogos e identidad; no se cachean
respuestas `/api` en el service worker. El alta de tiquets no es offline en esta fase.

Las fotos se comprimen, se guardan como Blob y se cargan con TUS. Los archivos son privados y
requieren autorización, también al descargarse. Las actualizaciones PWA se confirman y el service
worker se entrega sin caché; no depender de Background Sync para conservar trabajo.

## 10. SQL y migraciones

- SQL es la definición completa del esquema. Una migración por preocupación, con nombre
  `NNNN_verbo_objeto.sql`; nunca editar una integrada a `main`.
- Usar parámetros SQL, claves y restricciones; comentar los objetos no evidentes. Tablas plurales,
  columnas `snake_case`, claves `id` / `<singular>_id` e índices descriptivos.
- Fechas `timestamptz`, zona configurable; indicadores derivados de eventos/tramos, sin copiar
  cifras calculadas a columnas ni fijar una zona en el código.
- Los listados de nombres ordenan con `public.natural_sort_key(...)` para que los tramos numéricos
  se comparen como números. Un criterio de negocio (`position`, fecha, conteo) siempre va primero.
- Toda consulta de tiquets incorpora alcance autorizado. No hay RLS ni metadatos editables como
  fuente de permisos; roles y ámbitos son datos controlados del servidor.
- El cambio de estado y su evento se escriben en la misma transacción. La bitácora es de solo
  agregar; separar acciones y validar permiso, precondiciones e idempotencia.
- Las integraciones futuras definen almacenamiento aislado, sin dependencias desde el núcleo.
  No asumir la existencia de tablas retiradas de importación.
- Referencia en migraciones, demo explícita local; nunca datos reales en semillas o pruebas.
- Añadir índices según filtros/claves y medición; no introducir particiones o cachés sin evidencia.

## 11. Servidor

Las rutas Fastify validan y delegan en servicios/repositorios. Separar acciones por responsabilidad,
usando funciones puras donde corresponda. Autorización y alcance son obligatorios antes de leer o
modificar datos; no confiar en restricciones de la interfaz. Un recurso fuera de alcance devuelve
404 opaco, según el contrato de [permisos](permisos.md).

## 12. Errores, registro y secretos

Manejar, transformar o propagar errores; nunca un `catch` vacío. Utilizar el logger de Fastify
para servidor; evitar `console.log` en aplicación y no inventar un módulo de logging inexistente.
Los scripts pueden comunicar su resultado según su configuración de lint. No registrar datos
personales, tokens ni secretos. Solo valores públicos pueden llegar al bundle web.

Validar entradas, conservar el escape de React y no utilizar `dangerouslySetInnerHTML` con texto
externo. No incorporar `.env`, claves, dumps ni archivos de evidencia al repositorio. Las plantillas
se actualizan junto al contrato de [configuración](configuracion.md).

## 13. Pruebas

| Nivel | Cobertura |
|---|---|
| Vitest sin DB | Dominio, contratos, formularios y lógica de cliente/servidor |
| Vitest + PostgreSQL real | API, permisos positivos/negativos, transacciones, migraciones e integridad |
| Playwright | Flujos de usuario, incluidos evidencia y trabajo offline |

Todo bug corregido tiene una regresión. Dominios nuevos llevan pruebas de reglas; rutas/tablas
nuevas, permisos y alcance positivos y negativos. Las acciones cubren éxito, permiso incorrecto,
transición inválida e idempotencia. Usar datos ficticios, reloj controlado cuando sea relevante y
sin dependencia de orden ni red externa. Nombrar las pruebas por comportamiento en español.
El núcleo se prueba sin cargar adaptadores. No debilitar, omitir o borrar pruebas para pasar.

## 14. Verificación automática

TypeScript, ESLint y dependency-cruiser verifican tipos, límites y fronteras. Knip detecta código
sin uso; los scripts de documentos/independencia revisan fuentes pertinentes de Git. Prettier,
lint-staged y commitlint verifican formato y commits. Las configuraciones ejecutables son la
referencia de las reglas aplicadas; no se copia aquí otra configuración divergente.

El [catálogo de comandos](comandos.md) detalla cada comprobación. La CI ejecuta la compuerta
completa y el smoke de imagen. Para preparar el entorno se sigue [desarrollo](../start/desarrollo.md).

## 15. Terminado

Un cambio queda terminado con pruebas apropiadas y documentación actualizada; si cambia el
comportamiento visible, con su entrada en el CHANGELOG, sin secretos
ni código comentado o pendientes ocultos. Usar `check:fast` y `test:affected` en el ciclo; antes de
integrar a `main`, `pnpm check` completo en verde y evidencia real. Para migraciones, verificar
instalación limpia en pruebas y toda la integración PostgreSQL. No reiniciar una base con datos
para comprobar una migración. Si falló algo, informar y corregir antes de afirmar éxito.

## 16. Documentación

Actualizar la referencia canónica del comportamiento en el mismo commit; el [índice](../README.md)
define dónde vive cada tema. Los comentarios explican decisiones no obvias, no repiten el código.
Documentar interfaces públicas y objetos SQL que lo necesiten. Un ADR nuevo contiene contexto,
alternativas, decisión, consecuencias y forma de revertir; no se crea para cada cambio de pantalla.

## 17. Git

Commits convencionales en español, una idea por commit y ramas cortas desde `main`. El flujo de
entrega está en [CONTRIBUTING](../../CONTRIBUTING.md). No subir secretos, datos reales o salidas de
build. Las decisiones con efecto en producción se preparan localmente; requieren autorización
explícita antes de ejecutarlas en infraestructura real.

## 18. Dependencias

Reutilizar lo existente cuando resuelva el problema. Antes de añadir una dependencia, verificar
registro, origen oficial, mantenimiento y licencia MIT, Apache-2.0, BSD o ISC; justificarla en el
commit. Confirmar el bloqueo de pnpm y retirar dependencias sin uso. Los SDK de sistemas externos
pertenecen a su adaptador, no al núcleo.

## 19. Cambios que requieren cuidado

No ejecutar operaciones destructivas de Git, borrar datos fuera del proyecto, instalar globalmente,
leer secretos o actuar en producción sin autorización. No sustituir una regla de negocio por una
suposición técnica ni hacer que el núcleo dependa de un sistema externo. Los límites específicos
para agentes permanecen en [AGENTS.md](../../AGENTS.md).
