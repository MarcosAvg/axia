# Estilo de documentación

Normas para la documentación de Axia (`README.md`, `deploy/`, `docs/`). El objetivo es que cualquier
persona pueda seguir los documentos sin ambigüedad y sin conocer el historial de la conversación.

## Alcance

Se aplican a los documentos **operativos y de referencia**: `README.md`, todo `deploy/`, y las guías
de `docs/` que describen procedimientos (por ejemplo, `docs/notificaciones-push.md` y las secciones
de despliegue de `docs/configuracion-inicial.md`).

No se aplican a los documentos **internos de decisión y memoria** (ADR en `docs/decisions/`,
`docs/ESTADO.md`) ni a los documentos de negocio redactados por la institución.

## Registro

1. **Impersonal**: no se usa la segunda persona ("tú", "tu", "ti"), ni la primera ("yo",
   "nosotros"). Ejemplo: "Se configura…", no "Configura…".
2. **Instrucciones en infinitivo** o pasiva refleja: "Crear el archivo", "Se aplica la migración".
   No se usan preguntas retóricas ni exclamaciones.
3. **Sin meta-comentarios**: no se describe quién ejecuta algo ni el proceso de la conversación
   ("tú lo ejecutas", "por petición de…", "si quieres"). Un documento describe **qué** y **cómo**, no
   el contexto de su redacción.
4. **Hechos, no opiniones**. Una recomendación se acompaña de su criterio objetivo; en caso
   contrario, se presenta como una alternativa más.

## Estructura

Cada documento se organiza con las secciones que apliquen, en este orden:

1. **Objeto**: qué resuelve el documento en una o dos frases.
2. **Requisitos**: lo necesario antes de empezar.
3. **Procedimiento**: pasos numerados y reproducibles.
4. **Verificación**: cómo comprobar que el resultado es correcto.
5. **Referencias**: enlaces a documentos relacionados.

Las secciones que no apliquen se omiten.

## Formato

- **Encabezados en oración** (solo la primera palabra en mayúscula), texto en **es-MX**.
- **Datos enumerables en tablas**: requisitos, variables, comandos, endpoints, mensajes de error.
- **Avisos impersonales**: `> **Nota:** …` y `> **Advertencia:** …`. No se usan "ojo", "no subas",
  "revisa".
- **Bloques de código con lenguaje** (`bash`, `yaml`, `sql`, `ts`) e instrucciones copiables sin
  edición, salvo marcadores explícitos entre `MAYÚSCULAS` o `<ángulos>`.
- **Rutas relativas** para referencias cruzadas dentro del repositorio.
- **Terminología consistente**: un concepto, un término.

## Terminología

| Término | Significado |
|---|---|
| Frontend | Aplicación web (SPA/PWA) de Axia |
| Backend | PostgreSQL 17 + Drizzle + Fastify 5 |
| Reverse proxy | Servidor que termina TLS y enruta hacia la app y la API |
| Migración | Archivo SQL versionado en `apps/server/db/migrations/` |
| Imagen | Imagen de contenedor del frontend o de las migraciones |
| Instancia | Despliegue concreto de Axia con su base de datos y su configuración |

## Ejemplos

| No adecuado | Adecuado |
|---|---|
| "Copia `.env.example` a `.env` y edítalo" | "Crear el archivo de entorno a partir de la plantilla y ajustar los valores" |
| "tu proxy TLS apunta ahí" | "el reverse proxy TLS apunta a ese puerto" |
| "no subas este archivo al repositorio" | "este archivo no debe incorporarse al repositorio" |
| "o hazlo a mano" | "o generarlo manualmente" |

## Lista de verificación

- [ ] No contiene "tú", "tu", "ti", "yo" ni "nosotros".
- [ ] Las instrucciones están en infinitivo o pasiva refleja.
- [ ] Los datos enumerables están en tablas.
- [ ] Los avisos usan `Nota` o `Advertencia`.
- [ ] No hay meta-comentarios ni preguntas retóricas.
- [ ] Los términos coinciden con el glosario.
