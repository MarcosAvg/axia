# Consultar historia en Git

Las referencias del checkout describen Axia actual. Los diseños, auditorías, planes concluidos y
ADR anteriores se conservan en Git, sin mantener otra copia ni usarlos como instrucciones vigentes.

| Commit | Contenido recuperable |
|---|---|
| `2455a48` | Los 83 ADR anteriores a 0099, consolidados en las referencias actuales |
| `488862f` | Documentación histórica retirada antes: ADR archivados, diseños, auditoría y planes |
| `b26c1b4` | Cierre de la retirada histórica |

Desde la raíz del repositorio se pueden descubrir rutas y leer cualquier archivo sin restaurarlo:

```bash
git ls-tree -r --name-only 2455a48 docs/decisions
git show 2455a48:docs/decisions/0070-autenticacion-local-y-sesiones.md
git ls-tree -r --name-only 488862f docs
git show b26c1b4:docs/decisions/0014-ofertas-de-ruteo.md
```

Sustituir commit y ruta según la tabla. Si un clon superficial no contiene esos commits, obtener
el historial del remoto antes de consultarlos (`git fetch --unshallow`). La historia documental no
reemplaza un respaldo de los datos de una instancia; los números de ADR retirados no se reutilizan.

Los [ADR 0099–0102](../decisions/README.md) justifican las consolidaciones actuales. Se conserva
[integraciones y migración](integraciones-y-migracion.md) como referencia de origen y normalización
exigida por las instrucciones del proyecto; no implica adaptadores externos disponibles.
