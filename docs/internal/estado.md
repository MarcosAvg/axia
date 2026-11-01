# Axia — Estado del proyecto

Memoria de continuidad. Historial en [CHANGELOG](../../CHANGELOG.md), razones técnicas en
[arquitectura](../concepts/arquitectura.md) y [ADR](../decisions/README.md).

**Última actualización:** 2026-10-31

## Tarea cerrada: catálogos y demo operables

- Migración nueva 0018: 29 subestados para los nueve motivos iniciales de pausa incompletos;
  los diez árboles permiten pausar/reanudar. No cambia SQL integrado ni nodos personalizados.
- Servidor e interfaz evitan iniciar pausas sin salida. Administración valida motivos, parentesco,
  tipos y duplicados; protege árboles con pausas abiertas y muestra errores 400/409 comprensibles.
  Nuevos motivos activos por defecto y selectores operativos actualizados al guardar.
- Demo con ofertas utilizables, evidencias WebP sintéticas rotuladas, descripciones, validaciones
  y participación coherentes. Cobertura de ubicaciones, dependencias, clasificación, técnicos y
  supervisores comprobada; personas sin cuenta siguen siendo válidas.
- Reaplicar recupera solo ofertas faltantes de registrados sin actividad; no reescribe historial.
  Las evidencias/validaciones nuevas se crean en escenarios nuevos, no retroactivamente.
  CLI local y API comparten ruta de archivos, incluidas las configuraciones personalizadas.
- Decisión [0103](../decisions/0103-catalogos-operables-y-demo-coherente.md). Revisión independiente
  sin hallazgos pendientes tras corregir desfase de rutas demo/desarrollo. Negocio intacto.

## Evidencia de esta tarea

- Regresiones RED→GREEN para raíz sin salida, alta de motivos, padre inválido, duplicados, edición
  con pausa abierta, demo sin ofertas, evidencias/validaciones y ruta local de imágenes.
- `AXIA_ENV_FILE=/dev/null pnpm check:fast`: código 0; lint, tipos y 367 pruebas.
- `pnpm test:affected`: detectó fixture antiguo de pausa sin subestado. Se reutiliza el motivo
  preconfigurado completo sin quitar aserciones; prueba afectada 4/4 verde.
- `AXIA_ENV_FILE=/dev/null pnpm test:e2e:smoke`: 12/12 verdes, incluida alta de raíz y subestado.
- `AXIA_ENV_FILE=/dev/null pnpm check`: cierre código 0; 46 Node + scripts Bash, 60 servidor,
  307 web, 53 navegador y 261 PostgreSQL; lint, tipos, estáticos y build verdes.
  Se corrigieron antes límites de tamaño de fixtures y una exportación sin consumidor; reglas intactas.
- Documentación: 35 archivos, cero enlaces rotos. Persiste aviso previo de chunks >500 kB.
- Integración y push completados; imagen publicada y verificada como se indica abajo.
  Sin cambios en infraestructura de producción.

## Imagen publicada y siguiente paso operativo

- Publicación manual autorizada desde `main`, commit `b3b1fa90253ba373ace68c88bda624aaf95d15e3`.
- [Flujo 41254674345](https://github.com/MarcosAvg/axia/actions/runs/41254674345): verificación,
  Docker y publicación `success`. La CI de `main` también terminó correctamente.
- Imagen pública `ghcr.io/marcosavg/axia/axia-app:b3b1fa90253ba373ace68c88bda624aaf95d15e3`.
  Digest confirmado directamente en GHCR:
  `sha256:30bd3af0de7ce2981de50ae7cb5c03d965377d136155ac21e8ffeae1ebbd5533`.
- Paquete `axia-self-hosted` generado como artefacto del flujo. No se creó una etiqueta semántica
  ni una release nueva. `v0.5.1` sigue disponible y no incluye estas correcciones.

Actualizar la instancia requiere autorización. La migración 0018 se aplica durante la actualización
normal. Para escenarios demo completos usar una base local nueva; no reiniciar una base cuyo
trabajo deba conservarse. Probar instalación en host limpio, configurar TLS y programar
respaldos/limpieza con restauración periódica siguen pendientes operativos.

## Diferencias de producto conocidas

La [especificación de negocio](../concepts/negocio.md) sigue siendo normativa:

- RN27: acción offline tardía rechazada/conflictiva no deja el evento sin efecto requerido.
- RN17: recaptura restringida a registrado/con supervisor/asignado, sin motivo obligatorio;
  RN06: reasignación directa a supervisor termina en `with_supervisor`.
- Tipo de servicio opcional en API de alta/atención; UI lo exige al atender.
- `auto_validation_days` configurable sin tarea automática; tampoco hay Web Push ni escalamiento.
- Botones calculados en cliente sin ámbito/participación/ventana; servidor rechaza acciones inválidas.
- La demo conserva la cobertura de una supervisora sobre dos equipos; RN04 limita a uno y esa
  restricción no se impone actualmente. No causa falta de ruteo, pero requiere revisión específica.
