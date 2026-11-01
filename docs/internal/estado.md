# Axia — Estado del proyecto

Memoria de continuidad. Historial en [CHANGELOG](../../CHANGELOG.md), razones técnicas en
[arquitectura](../concepts/arquitectura.md) y [ADR](../decisions/README.md).

**Última actualización:** 2026-10-31


## Tarea cerrada: detección y revisión de duplicados

- Una sola detección para el aviso y el alta: tiquets no finales del mismo edificio y ventana
  configurable. Son candidatos los de misma ubicación y problema, o texto normalizado por encima del
  umbral; el puntaje compuesto ordena y explica las coincidencias.
- Configuración real de ventana, umbral y campos visibles en `/admin/configuracion`, con API,
  formulario y pruebas; el aviso proyecta solo los campos permitidos.
- Decisiones auditadas: se marcan los candidatos mostrados al registrar de todas formas, el elegido
  al enlazar y los descartados, con actor y fecha. Panel en el detalle para enlazar o descartar y
  enlace visible “Duplicado de”.
- El original debe ser visible o haber sido candidato, no puede ser ya un duplicado y no se permiten
  ciclos. Al recapturar se recalculan las alertas pendientes.
- Migración 0019; se corrigió la lectura de los tipos de evento como arreglo. Decisión en el
  [ADR 0105](../decisions/0105-deteccion-revision-duplicados.md).

## Evidencia de esta tarea

- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; lint, tipos, estáticos y knip, 60 pruebas de
  servidor, 331 de web, 286 PostgreSQL y build.
- `AXIA_ENV_FILE=/dev/null pnpm test:e2e:smoke`: 17/17 verdes, incluidas las dos pruebas nuevas de
  aviso, marcado y descarte de duplicados.
- Documentación: 37 archivos, 0 enlaces rotos. Persiste el aviso previo de chunks >500 kB.

## Tarea anterior: eliminar catálogos sin uso

- Cada fila de catálogo ofrece “Eliminar” con confirmación explícita. Se borra solo si nada lo
  referencia; si tiquets, historial o configuración lo usan, el servidor responde 409 con la causa
  (“tiene subestados”, “tiene ubicaciones”) y sugiere desactivarlo.
- Los vínculos propios se retiran con el registro (dependencia–ubicación, franjas y festivos,
  designaciones del técnico). Los compartidos se comprueban antes: designaciones de una categoría,
  ubicaciones vinculadas a dependencias y avisos de un solicitante.
- RN-22 admite la excepción de registros nunca usados; decisión en el
  [ADR 0104](../decisions/0104-borrado-catalogos-sin-uso.md).
- Pruebas: borrado libre, dependencia con vínculos, conflicto por edificio, motivo con subestados y
  categoría designada, 404 al repetir y permiso. E2E crea edificio y ubicación, bloquea el borrado
  y después elimina ambos.

## Evidencia de catálogos sin uso

- `AXIA_ENV_FILE=/dev/null pnpm check`: código 0; lint, tipos, estáticos y knip, 60 pruebas de
  servidor, 331 de web, 276 PostgreSQL y build. Documentación: 36 archivos, 0 enlaces rotos.
- `AXIA_ENV_FILE=/dev/null pnpm test:e2e:smoke`: 15/15 verdes, incluida la eliminación bloqueada y
  permitida.
- Persiste el aviso previo de chunks >500 kB.

## Tarea anterior: catálogos completos, jerarquía y orden

- La lectura administrativa de los 14 catálogos devuelve datos derivados: conteos de uso
  (ubicaciones, edificios, subcategorías, problemas, técnicos y designaciones), la cuenta
  vinculada de solicitantes y técnicos, la categoría de cada problema, la ruta y profundidad de
  cada motivo y los totales de franjas y festivos de los calendarios.
- Los derivados se consultan en un read model aparte (`admin-row-queries.ts`) y nunca se aceptan
  al guardar; las columnas editables conservan su validación.
- Las tablas muestran todas sus columnas declaradas más la última actualización; los textos largos
  se recortan con su título completo y la cuenta inactiva se marca.
- Motivos: árbol real con sangría por profundidad, guía visual, contraer/expandir por rama,
  agrupación por uso y búsqueda que conserva a los antecesores. Se retiró la sangría con guiones.
- Orden: relaciones y enums ordenan por su etiqueta visible (antes por UUID); se puede ordenar por
  activo y por actualización; en árbol se ordenan hermanos sin aplanar la jerarquía; en pantalla
  angosta hay selector de columna y dirección.

## Evidencia de catálogos completos

- Regresiones nuevas para orden por etiqueta, agrupación y contracción del árbol, datos derivados
  del catálogo y cuenta inactiva.
- `AXIA_ENV_FILE=/dev/null pnpm check:fast`: código 0; lint, tipos y 60 pruebas de servidor + 330
  de web.
- `AXIA_ENV_FILE=/dev/null pnpm test:e2e:smoke`: 14/14 verdes, incluidas las dos pruebas nuevas de
  datos derivados, contracción de motivos y orden en pantalla angosta.
- `AXIA_ENV_FILE=/dev/null pnpm check`: cierre código 0; estáticos y knip, 60 + 330 unitarias,
  268 pruebas PostgreSQL, lint, tipos y build. Persiste el aviso previo de chunks >500 kB.
- Documentación: `docs/reference/api.md` describe la lectura enriquecida.

## Tarea anterior: catálogos y demo operables

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

## Evidencia de catálogos y demo

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
