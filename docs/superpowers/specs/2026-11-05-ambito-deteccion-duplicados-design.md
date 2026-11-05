# Ámbito de detección de duplicados — diseño

**Fecha:** 2026-11-05
**Estado:** propuesto

## Intención

Hoy el aviso de posible duplicado compara contra todos los tiquets no finales del mismo edificio
dentro de la ventana. En edificios grandes eso produce coincidencias demasiado generales. El ámbito
debe bajar a **edificio + ubicación + dependencia**: solo se avisa de tiquets del mismo punto físico
y de la misma dependencia.

## Objetivos

- Todo candidato comparte edificio, ubicación y dependencia con el tiquet evaluado.
- La vista previa (`POST /api/tickets/duplicates`) exige `locationId` y `dependencyId`.
- El puntaje vuelve a discriminar entre candidatos: ubicación y dependencia dejan de pesar porque
  son constantes.
- Documentación y pruebas reflejan la regla nueva.

## No objetivos

- No cambia la ventana temporal, el umbral de similitud ni los campos visibles.
- No cambia el flujo de revisión, enlace, descarte ni marcado de duplicado.
- No hay migración de esquema ni reescritura de candidatos históricos.
- No se fusiona nada automáticamente.

## Anti-objetivos

- Que un texto idéntico en otra ubicación o dependencia siga generando aviso.
- Que la creación de tiquets cambie: ubicación y dependencia ya son obligatorias allí.

## Restricciones

- La detección sigue en SQL puro con `pg_trgm`; nada de otra plataforma ni servicio externo.
- Las pruebas de integración se ejecutan contra PostgreSQL real.

## Enfoques considerados

1. **Filtros duros + reequilibrar el puntaje (elegido).** Ubicación y dependencia pasan a `where`;
   se eliminan del cálculo de puntaje y de los motivos. El puntaje se reparte entre lo que varía:
   `0.50` similitud de texto, `0.40` mismo problema, `0.10` misma subcategoría.
2. **Solo filtros duros, sin tocar puntaje ni motivos (descartado).** Cambio menor, pero todos los
   candidatos suman `0.30` fijo y muestran motivos de ubicación/dependencia que ya no distinguen
   nada.
3. **Mantener la dependencia como señal blanda (descartado).** No cumple el requisito de que sea
   obligatoria.

## Decisiones

- `duplicateCheckSchema` exige `locationId` y `dependencyId` como UUID. Una petición sin ellos
  responde `400`.
- `DuplicateInput` tipa `locationId` y `dependencyId` como obligatorios; la consulta agrega
  `t.location_id = … and t.dependency_id = …` y conserva el filtro de edificio.
- La admisión queda: mismo problema **o** similitud de texto ≥ umbral, siempre dentro del ámbito.
- `same_location` y `same_dependency` desaparecen de la consulta y del tipo de fila. Los `reasons`
  guardados y mostrados pasan a ser `problem` y `subcategory`.
- Los tiquets históricos con ubicación o dependencia nulas nunca son candidatos (no se puede
  confirmar el ámbito). No se rellenan datos.
- `pnpm db:duplicates` recalcula las alertas de los tiquets abiertos; se documenta como paso
  posterior a la actualización. No hay migración.
- Se registra la decisión en un ADR nuevo (0118) que refina el 0105, y se actualizan RN-29,
  `docs/reference/api.md`, `docs/guides/administracion.md` y el CHANGELOG.

## Pruebas

- Integración: un tiquet con el mismo edificio, ubicación y dependencia y mismo problema, con texto
  distinto, aparece como candidato con motivos `['problem']`.
- Integración: el mismo problema en otra ubicación no aparece; en otra dependencia tampoco.
- Integración: la vista previa sin `locationId` o sin `dependencyId` responde `400`.
- Integración: el puntaje se mantiene en el rango esperado y el orden sigue siendo por puntaje y
  luego por fecha.
- Se ajustan las pruebas existentes que esperaban motivos de ubicación, subcategoría y dependencia.

## Pendiente al implementador

- Redactar el texto exacto de RN-29, del ADR y de la guía de administración.
- Confirmar que ningún otro cliente llama a la vista previa sin ubicación o dependencia.
- Ejecutar `pnpm check:fast`, `pnpm test:affected`, la integración de PostgreSQL y la compuerta
  completa antes de integrar.
