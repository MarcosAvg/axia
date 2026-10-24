# Contribuir

## Objeto

Describir el flujo de contribución a Axia: ramas, mensajes de commit, compuerta de calidad y proceso
de revisión.

## Requisitos

- Node.js LTS y pnpm (ver la puesta en marcha en `README.md`).
- Docker para PostgreSQL local (`pnpm db:start`).
- Leer `docs/reference/convenciones-codigo.md` (estructura, estilo y reglas de dependencia) y
  `docs/reference/estilo-documentacion.md` (redacción de la documentación).

## Flujo de trabajo

1. Crear una rama corta desde `main` con un prefijo según el tipo de cambio:

   | Prefijo | Uso |
   |---|---|
   | `feat/…` | Funcionalidad nueva |
   | `fix/…` | Corrección de errores |
   | `docs/…` | Documentación |
   | `chore/…` | Mantenimiento y configuración |

2. Realizar commits pequeños y atómicos.
3. Durante el trabajo, ejecutar `pnpm check:fast` y `pnpm test:affected`. No hace falta repetir
   la compuerta completa tras cada edición.
4. Antes de integrar, ejecutar `pnpm check` completo una vez y corregir solo lo que falle.
5. Integrar a `main` solo con la compuerta en verde.

## Mensajes de commit

Se usa [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/), verificado por un hook
al confirmar. El asunto va en minúsculas.

```
feat(tickets): agrega la lista con filtros
fix(offline): reintenta la subida de evidencia
docs(deploy): documenta el contrato de reverse proxy
```

## Compuerta de calidad

`pnpm check` es la compuerta de cierre: lint, tipos, docs, independencia del núcleo, fronteras,
knip, pruebas (Vitest y Playwright), integración contra PostgreSQL real y build. Para el ciclo
local usa `pnpm check:fast` y `pnpm test:affected`. Necesita las
variables `MIGRATION_DATABASE_URL`, `AXIA_APP_PASSWORD` y `DATABASE_URL`; Playwright prepara su
propia base con la semilla demo.

| Comando | Verificación |
|---|---|
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Tipos |
| `pnpm check:docs` | Enlaces relativos de la documentación |
| `pnpm check:agnostic` | El núcleo no menciona plataformas externas |
| `pnpm check:boundaries` | Dependencias entre capas |
| `pnpm knip` | Código y dependencias sin uso |
| `pnpm test:unit` | Unitarias de servidor y web, sin Playwright ni PostgreSQL |
| `pnpm test:affected` | Solo pruebas relacionadas con archivos cambiados |
| `pnpm test:e2e:smoke` | Flujos críticos de Playwright |
| `pnpm test:e2e` | Todos los flujos de Playwright |
| `pnpm db:test` | Integración contra PostgreSQL real |
| `pnpm check:fast` | Ciclo local: lint, tipos y unitarias |
| `pnpm check:static` | Scripts, docs, agnóstico, fronteras y knip |

## Pull requests

Antes de abrir una pull request:

- [ ] `pnpm check` en verde.
- [ ] `pnpm check:docs` sin enlaces rotos.
- [ ] Pruebas añadidas o actualizadas para el cambio.
- [ ] Documentación actualizada en el mismo cambio.
- [ ] Sin secretos ni claves en el diff.
- [ ] Un commit por idea, con mensaje convencional.

## Documentación

La documentación forma parte del cambio: si se modifica un comportamiento, se actualiza en el mismo
commit. La redacción sigue `docs/reference/estilo-documentacion.md` y el índice está en `docs/README.md`.

## Conducta y seguridad

El proyecto se rige por `CODE_OF_CONDUCT.md`. Los problemas de seguridad se reportan según
`SECURITY.md`, nunca en un issue público.
