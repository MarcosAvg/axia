# Contribuir a Axia

Preparar el entorno siguiendo [desarrollo](docs/start/desarrollo.md). Las reglas de código están en
[convenciones](docs/reference/convenciones-codigo.md); para agentes también aplica [AGENTS.md](AGENTS.md).

## Entregar un cambio

1. Revisar el [estado del proyecto](docs/internal/estado.md) y crear una rama corta desde `main`
   (`feat/`, `fix/`, `docs/`, `refactor/` o `chore/`; los agentes usan su prefijo de sesión).
2. Hacer cambios pequeños con pruebas del comportamiento afectado. Un bug corregido debe tener
   una regresión; no se debilitan pruebas, lint o tipos para conseguir un resultado verde.
3. Ejecutar `pnpm check:fast` y `pnpm test:affected` durante el trabajo. El selector puede ampliar
   la selección a `pnpm check`; no garantiza ejecutar solo un subconjunto.
4. Actualizar la referencia documental del comportamiento cambiado en el mismo commit.
5. Antes de integrar, iniciar el PostgreSQL de pruebas y ejecutar `pnpm check` completo. Corregir
   con la suite afectada y repetir la compuerta al final si hubo cambios o fallos.
6. Integrar solo con comprobación verde; informar qué cambió, evidencia y limitaciones.

El [catálogo de comandos](docs/reference/comandos.md) detalla las verificaciones. Las pruebas usan
bases locales desechables y valores ficticios por defecto; no requieren leer dotenv privados.
Los cambios documentales verifican enlaces y ejemplos; no necesitan pruebas que comparen prosa.
La compuerta completa sigue siendo requisito antes de integrar a `main`.

## Commits y revisión

Usar Conventional Commits en español, con asunto en minúsculas y una idea por commit:

```text
feat(tickets): agregar asignación de técnico
fix(offline): conservar acciones después de un conflicto
docs: aclarar recuperación de respaldos
```

Los hooks aplican formato y lint y verifican el mensaje. Una PR debe explicar el problema,
el comportamiento resultante, las pruebas ejecutadas y cualquier limitación relevante.
No incorporar secretos, datos reales ni resultados de compilación.

## Documentación y comunidad

Mantener una referencia por tema según el [índice documental](docs/README.md). Una corrección o
un detalle de interfaz se registra en CHANGELOG; un ADR se reserva para decisiones técnicas con
alternativas y consecuencias duraderas. Aplican el [estilo documental](docs/reference/estilo-documentacion.md),
el [código de conducta](CODE_OF_CONDUCT.md) y la [política de seguridad](SECURITY.md).
