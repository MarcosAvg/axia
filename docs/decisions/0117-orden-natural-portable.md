# 0117 — Orden natural portable de nombres

**Fecha:** 2026-11-05
**Estado:** aceptada

## Decisión

Los listados de nombres se ordenan con la función SQL `public.natural_sort_key(text)`. La función
separa el texto en tramos alfabéticos y numéricos, rellena los tramos numéricos con ceros a la
izquierda y devuelve una clave que ordena los números como números: `Piso 2` queda antes que
`Piso 10`, y `Torre 2 Piso 10` ordena por ambos tramos.

Los `ORDER BY` de nombres usan `public.natural_sort_key(...)`. Cuando existe un criterio de negocio
más fuerte, como `position` en prioridades y motivos, se conserva como primer criterio y el orden
natural solo desempata. Las columnas no textuales del administrador mantienen su orden nativo.

La función es inmutable, estricta y paralela segura: no usa ICU ni extensiones, conserva la
colación de cada instalación para las partes alfabéticas y deja los valores nulos al final, como el
orden anterior. La migración concede su ejecución a `axia_app` y revoca el permiso público.

## Alternativas y consecuencias

Se descartó una colación ICU (`es-MX-u-kn`): produce un orden español más rico, pero exige un
PostgreSQL compilado con ICU y hace fallar la migración en instalaciones que no lo incluyan. La
función es portable y solo cambia el orden de los tramos numéricos.

Se descartó ordenar solo en la web: la API seguiría devolviendo orden alfabético y cada cliente
tendría que repetir la regla, con riesgo de dejar desplegables fuera.

El coste es que la expresión de orden no puede usar un índice sobre el nombre y obliga a ordenar
en memoria. Los catálogos son pequeños y la comodidad de una regla única pesa más. Si en el futuro
una lista crece hasta necesitar índice, se puede añadir un índice de expresión sobre la función.

El relleno normaliza tramos de hasta 20 dígitos, suficiente para nombres de catálogo. Un tramo
mayor se compara por su longitud literal y queda fuera del caso de uso; si alguna vez aparece, la
función puede ampliarse con una clave prefijada por longitud.

Para revertir el cambio basta con retirar las llamadas a `natural_sort_key` de las consultas y
eliminar la migración en una instancia nueva; no se modifica ningún dato.
