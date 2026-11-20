# Plan de implementación del despliegue de Axia

> Para ejecutar el plan, usar superpowers:executing-plans y completar una tarea verificable por commit.

**Objetivo.** Un operador puede instalar una release identificable en un host limpio, actualizar una instancia con datos, detectar una falla y recuperar el estado anterior en un destino separado.

**Arquitectura propuesta.** Una ruta oficial para Linux con Docker Engine y Compose v2, PostgreSQL 17, una instancia de Fastify y un proxy HTTPS del operador. GitHub Actions publica artefactos verificados. El operador controla la promoción a su instancia y la ventana de mantenimiento. Los scripts Bash existentes concentran las operaciones recurrentes.

**Base del plan.** [Instalación](../../../deploy/README.md), [Operación](../../guides/operacion.md), [Configuración](../../reference/configuracion.md), [Límites vigentes](../../reference/limitaciones.md) y [ADR 0110](../../decisions/0110-latest-y-migracion-en-arranque.md).

## Alcance y decisiones propuestas

- Conservar las migraciones al arrancar y el rol de ejecución restringido. Un cambio de esquema se acompaña de una migración nueva conforme a las reglas del repositorio.
- Verificar primero Linux amd64. Publicar soporte para otras arquitecturas cuando haya una prueba real de instalación, actualización y recuperación en ellas.
- Mantener una sola ruta oficial de instalación en esta etapa. Soporte nativo con systemd, orquestación de múltiples hosts y alta disponibilidad quedan como ampliaciones con requisitos propios.
- Usar versiones identificadas por digest para instancias con datos reales. Mantener `latest` como canal móvil de releases estables, con actualización iniciada por el operador.
- Usar instancias locales o CI desechables y datos sintéticos durante la implementación. El operador configura el host, el proxy y los destinos de respaldo reales.
- Mantener configuración y credenciales fuera de Git, artefactos de CI y logs. Probar con valores de prueba y emitir solo el estado de cada comprobación. Cambiar comportamiento y documentación en el mismo commit.
- Acordar con el operador la pérdida de datos tolerable y el tiempo máximo de recuperación antes de poner datos reales. Usar un respaldo diario y un simulacro trimestral como punto de partida propuesto. Ajustar la frecuencia después de medir el tiempo y la pérdida potencial en el simulacro.

## Casos que deben quedar cubiertos

| Caso | Resultado esperado | Tarea |
|---|---|---|
| Después del respaldo, `latest` apunta a otra imagen | Se recupera la imagen original en un host sin caché de Axia | 1 y 3 |
| El respaldo está corrupto o corresponde a otra imagen | La restauración se detiene antes de parar la app o escribir datos | 1 |
| Falla el empaquetado o se publica una prerelease | El canal estable mantiene la release anterior | 2 |
| Falla una migración con escritores bloqueados | La instancia queda en mantenimiento y puede recuperarse en un destino separado | 3 y 5 |
| PostgreSQL responde, pero HTTPS o el volumen de evidencias falla | El operador identifica qué comprobación falló | 4 |

## 1. Recuperación por identidad de imagen

**Archivos.** `deploy/scripts/compose-operations.sh`, `backup-all.sh`, `restore-all.sh`, `recovery.test.sh` y [Operación](../../guides/operacion.md).

- [ ] Añadir casos de prueba para restaurar un respaldo tomado con `latest` usando el digest original, rechazar una imagen distinta antes de cualquier mutación y seguir aceptando un manifiesto de formato 1. Ejecutar `bash deploy/scripts/recovery.test.sh` y verificar que el caso nuevo de `latest` falle.
- [ ] Crear el formato 2 del manifiesto. Conservar la referencia original, el ID local y los hashes del respaldo. Añadir `image_digest=registro/repositorio@sha256:…`, obtenido de la imagen en ejecución o, con la app detenida, de la imagen local seleccionada y verificada. Para imágenes locales sin digest descargable, conservar el formato 1 y avisar que se requiere conservar la imagen para recuperar en otro host. Cubrir ese caso en la prueba.
- [ ] Hacer que el restaurador valide el digest del formato 2 y el ID local de la imagen seleccionada, aunque cambie el alias configurado. Mantener el comportamiento documentado del formato 1 y conservar las comprobaciones de checksums, destino vacío y restauración transaccional. Validar imagen y archivos antes de detener la app.
- [ ] Ejecutar `bash deploy/scripts/recovery.test.sh` y `bash deploy/scripts/compose-image.test.sh`. Los controles deben pasar, incluida la compatibilidad con respaldos anteriores.
- [ ] Actualizar la guía de respaldo y registrar el cambio con `fix(deploy): permite recuperar respaldos por digest`.

## 2. Publicación y promoción del canal estable

**Archivos.** [Workflow de publicación](../../../.github/workflows/publish-images.yml), `scripts/package-release.mjs`, `scripts/package-release.test.mjs`, [Instalación](../../../deploy/README.md) y [Soporte](../../../SECURITY.md).

- [ ] Añadir pruebas de clasificación de referencias para una etiqueta estable, una prerelease, una ejecución manual en rama y una etiqueta inválida. Probar que el paquete identifica el digest exacto y contiene todos los archivos que necesita el operador.
- [ ] Clasificar el canal una sola vez para construcción y publicación. Publicar el SHA y, para etiquetas válidas, la versión. Marcar las prereleases en GitHub. Promover `latest` únicamente para una release estable cuyo paquete y checksum ya se adjuntaron. Serializar la promoción entre etiquetas y comprobar dentro de ese paso que la versión candidata es la mayor estable publicada, usando orden numérico de versión. Probar una publicación estable anterior a la vigente.
- [ ] Documentar cómo se comprueba el checksum del paquete y cómo se fija el digest de `release.json`. Añadir a las notas de release la versión de origen probada, requisitos del host, cambios de configuración y pasos especiales. Alinear la política de soporte con la referencia de límites.
- [ ] Ejecutar `node --test scripts/package-release.test.mjs` y las pruebas de clasificación. Validar en CI, con un flujo de prueba que no publique, que una prerelease y un fallo de empaquetado no alcanzan la promoción.
- [ ] Registrar el cambio con `fix(release): promueve solo releases estables completas`.

## 3. Actualización y recuperación entre releases

**Archivos.** [CI](../../../.github/workflows/ci.yml), [Publicación](../../../.github/workflows/publish-images.yml) y `scripts/docker-upgrade-smoke.sh` como prueba complementaria a `scripts/docker-smoke.sh`.

- [ ] Implementar la prueba con dos entradas explícitas, el archivo del paquete de la última estable elegida como origen y la imagen candidata construida y probada en CI. Verificar el checksum del paquete antes de extraerlo. Usar proyectos Compose, redes y volúmenes desechables con nombres únicos.
- [ ] Instalar desde el paquete de origen y crear mediante los flujos públicos de Axia un usuario, un tiquet y evidencia. Con la operación de usuarios pausada, generar el respaldo con las herramientas operativas candidatas sobre la versión de origen. Ese orden debe quedar documentado para que la primera actualización que introduce el formato 2 pueda aprovecharlo.
- [ ] Actualizar con la configuración y las herramientas del paquete candidato. Verificar salud, login, lectura del tiquet y el hash de la evidencia recuperada vía API. Restaurar luego el respaldo en un segundo proyecto vacío con la imagen original por digest, incluso si el alias móvil local apunta a la candidata. Repetir las comprobaciones del tiquet y su evidencia.
- [ ] Inyectar un fallo de migración en un escenario de prueba. Comprobar que la candidata no recibe tráfico y que la recuperación anterior sigue disponible. Conservar logs de diagnóstico sin secretos y limpiar solo los recursos creados por la prueba.
- [ ] Ejecutar el escenario con Docker real. La publicación estable debe esperar el resultado verde y guardar las versiones de origen y destino probadas. Registrar el cambio con `test(deploy): verifica actualización y recuperación entre releases`.

## 4. Comprobaciones y alertas de operación

**Archivos.** `deploy/scripts/check-instance.sh` y `deploy/scripts/check-instance.test.sh` nuevos, [Operación](../../guides/operacion.md) y `package.json` para integrar la prueba en `test:scripts`.

- [ ] Añadir casos de prueba para HTTPS inaccesible, base no disponible, volumen de evidencias sin escritura y ausencia de un respaldo completo reciente. Cada fallo debe devolver un estado distinto de cero y nombrar la comprobación que falló sin volcar configuración privada.
- [ ] Implementar la comprobación local de estado, espacio y permisos en los destinos operativos. Usar el usuario efectivo de la app para una escritura temporal de verificación en el almacenamiento de evidencias y retirar su archivo al terminar. Consultar el HTTPS público del operador con un tiempo límite. Distinguir un fallo de acceso HTTPS de un fallo del `ready` interno cuando el entorno permita ejecutar ambas comprobaciones.
- [ ] Usar el manifiesto de un conjunto completo para evaluar la antigüedad del último respaldo, con un umbral ajustable. Documentar un ejemplo de ejecución programada y entrega de errores al sistema de alertas del operador. Mantener separadas las pruebas periódicas de recuperación y el chequeo frecuente de salud.
- [ ] Ejecutar `bash deploy/scripts/check-instance.test.sh` y `pnpm test:scripts`. Verificar localmente una instancia sana y provocar cada fallo en una instancia desechable. Registrar el cambio con `feat(deploy): añade comprobaciones operativas`.

## 5. Procedimiento de puesta en servicio y ensayo general

**Archivos.** [Instalación](../../../deploy/README.md), [Operación](../../guides/operacion.md), [Configuración](../../reference/configuracion.md) y [Límites](../../reference/limitaciones.md).

- [ ] Documentar la preparación del host, directorios de datos y copias, permisos, red y HTTPS. Restringir el acceso al alta inicial desde el proxy hasta crear el primer administrador. Probar login, SSE y la subida y descarga de una evidencia y de un adjunto con los límites admitidos.
- [ ] Documentar una secuencia única de actualización. Bloquear el tráfico de usuarios y las tareas escritoras, confirmar la identidad instalada, comprobar espacio y respaldo íntegro fuera del host, aplicar la release elegida, validar y reabrir el tráfico. Mantener la pausa de escritores aunque el script de respaldo vuelva a arrancar la app.
- [ ] Documentar el punto de decisión de reversión. Antes de reabrir el tráfico, una falla permite volver al conjunto previo en otro proyecto después de validarlo. Si ya hubo escrituras en la versión nueva, conservar ambos conjuntos y coordinar qué cambios pueden recuperarse antes de sustituir la instancia activa.
- [ ] Ensayar en un host Linux limpio de laboratorio, con un proxy de prueba y el paquete final. Registrar versión, tiempo de parada, tiempo de recuperación, resultado del login, conteo de tiquets, integridad de evidencias y alertas verificadas. Actualizar los pendientes solo después de registrar evidencia del ensayo.
- [ ] Ejecutar `pnpm check:docs` y registrar el cambio con `docs(deploy): documenta puesta en servicio y recuperación`.

## Criterio de entrega

La primera versión operativa requiere las tareas 1 a 5. Las tareas 1 y 2 pueden revisarse por separado. La tarea 3 consume sus resultados y la tarea 5 reúne la evidencia de las anteriores. Antes de integrar a `main`, cada cambio de código pasa por `pnpm check:fast` y `pnpm test:affected`, además de la prueba específica de su tarea. La integración final requiere `pnpm check` y el ensayo de Compose real. El registro de entrega debe identificar los artefactos que se probaron y el resultado del ensayo en host limpio.

## Registro del ensayo local

El 20 de noviembre de 2026 se probó el paquete publicado de `v0.31.1`, verificado por SHA-256,
en proyectos desechables de Docker Engine 29.10.0 y Compose 5.8.0 sobre Linux x86_64. La imagen
candidata local de la prueba quedó identificada como `axia-app:d4883907d582202a72ffa11d297c9c00ddbdf326`.
El ensayo recreó la versión candidata tras cambiar un alias local, comprobó un fallo de arranque
del migrador y recuperó el origen en un proyecto independiente por su digest.

| Comprobación | Resultado |
|---|---|
| Ventana sintética de respaldo y actualización | 23 s |
| Recuperación y comprobación en proyecto nuevo | 14 s |
| Acceso, archivo de evidencia, adjunto y conexión SSE después de actualizar y recuperar | Correctos |
| Alta y acceso por HTTPS tras un proxy Nginx de laboratorio | Correctos |
| Datos sintéticos en el ensayo HTTPS | 1 tiquet, 4 eventos, 1 evidencia, 1 adjunto |
| Diagnóstico de una instancia sana | HTTPS, PostgreSQL, evidencias, espacio y respaldo correctos |
| Incidentes provocados en Docker real | Respaldo ausente, proxy detenido, PostgreSQL detenido y volumen de evidencias de solo lectura detectados |

Los tiempos corresponden a datos sintéticos pequeños. Queda pendiente confirmar las cifras en
un host recién preparado con el almacenamiento, el proxy y la política de respaldo del operador.
