# Historia en Git

La documentación exclusivamente histórica se retiró del checkout. Git conserva su contenido en
el commit base `488862f`; no describe la implementación actual. Para consultar cualquier ruta del
índice, ejecutar desde la raíz del repositorio:

```bash
git show 488862f:docs/decisions/archivo/0002-stack-anterior.md
```

Sustituir la ruta después de `:` por la del documento deseado. El comando consulta la prosa sin
restaurar archivos al checkout ni modificar el árbol de trabajo.
En un clon superficial que no contenga ese commit, recuperar primero el historial con
`git fetch --unshallow`.

## Documentos retirados

- `docs/decisions/archivo/0002-stack-anterior.md`
- `docs/decisions/archivo/0015-rpc-definer-y-rls-de-lectura.md`
- `docs/decisions/archivo/0016-autenticacion-anterior.md`
- `docs/decisions/archivo/0017-evidencias-en-storage.md`
- `docs/decisions/archivo/0018-escritura-administracion-por-rls.md`
- `docs/decisions/archivo/0029-infraestructura-importacion.md`
- `docs/decisions/archivo/0030-adaptador-importacion.md`
- `docs/decisions/archivo/0032-despliegue-y-respaldos.md`
- `docs/decisions/archivo/0033-linea-de-tiempo-importada.md`
- `docs/decisions/archivo/0034-convivencia.md`
- `docs/decisions/archivo/0037-app-docker-compose.md`
- `docs/decisions/archivo/0059-importar-catalogos.md`
- `docs/decisions/0031-verificacion-metricas.md`
- `docs/decisions/0035-produccion-push-ci-capacitor.md`
- `docs/history/diseno-ui.md`
- `docs/history/auditoria-ui-ux.md`
- `docs/history/modelo-datos-fase-1.md`
- `docs/internal/auditoria-estructura-self-hosted-2026-10-31.md`
- `docs/superpowers/plans/2026-10-31-consolidacion-self-hosted.md`
- `docs/superpowers/plans/2026-10-31-consolidacion-interna.md`

## Referencias conservadas

- [Decisiones](../decisions/README.md): índice de criterios vigentes y decisiones parciales, con
  enlaces a la implementación que reemplaza sus detalles históricos.
- [Integraciones y migración](integraciones-y-migracion.md): referencia de origen y normalización,
  conservada por las instrucciones del proyecto; no implica adaptadores activos ni tablas de
  importación disponibles. Cualquier adaptador futuro necesita su propia decisión y migración.
- [Notificaciones](../guides/notificaciones.md): Web Push y escalamiento siguen pendientes; no se
  retiran como si fueran funcionalidad descartada.
