# 0128 — Publicación verificada y recuperación por digest

**Fecha.** 2026-11-20.

**Estado.** Aceptada.

## Contexto

El [ADR 0110](0110-latest-y-migracion-en-arranque.md) adoptó un canal móvil para simplificar la
instalación. Una etiqueta puede cambiar después de generar un respaldo. Al recuperar en otro
host, el operador necesita una referencia descargable de la imagen que produjo el conjunto.
El canal móvil también debe identificar una release cuyo paquete de instalación ya esté disponible.

## Decisión

- Los respaldos coordinados registran en el manifiesto de formato 2 el digest del registro y el
  ID local de la imagen. La restauración comprueba ambos antes de modificar el destino. Para
  respaldos de formato 1 se requiere la referencia original y el ID local. El formato 1 sigue
  disponible para imágenes locales que el operador conserva por su cuenta.
- El workflow verifica la instalación y el salto desde una release estable publicada. Publica
  los artefactos por versión y promueve la mayor release estable después de verificar su paquete.
  El trabajo de promoción está serializado y puede reintentarse a partir del artefacto publicado.
- El operador fija el digest cuando necesita una versión reproducible y decide cuándo ejecuta la
  actualización. El destino de recuperación es otro proyecto con volúmenes nuevos.

## Alternativa y consecuencias

Exigir una selección manual de digest en cada instalación simplificaría el canal de publicación,
pero quitaría la opción de seguir una release estable con la configuración inicial. La combinación
de canal estable y digest en el manifiesto permite conservar esa instalación simple y ensayar la
recuperación en otro proyecto con la misma imagen. Para comprobar el respaldo completo siguen
siendo necesarios los hashes del dump y de los archivos, y un ensayo de restauración.

La secuencia para operadores está en [Operación](../guides/operacion.md).
