# 0119 — React Compiler y formularios de React Hook Form

**Fecha:** 2026-11-05
**Estado:** aceptada

## Decisión

Los formularios de React Hook Form no usan `reset` para sincronizar ajustes que llegan desde el
servidor. En su lugar, el contenedor remonta el formulario con una clave estable cuando cambian los
datos guardados, de modo que `useForm` arranca con `defaultValues` nuevos y el estado queda limpio.
Los desplegables cuyas opciones llegan por consulta también se remontan cuando las opciones están
disponibles, para aplicar el valor guardado. La compuerta incluye `pnpm test:compiler`, que ejecuta
las pruebas del formulario con React Compiler activo.

## Contexto

React Compiler memoiza el resultado de `register(...)` y los elementos JSX en el build de
producción. React Hook Form implementa `reset` vaciando el registro de campos y esperando que los
`ref` de `register` se vuelvan a ejecutar en el siguiente render. Con los refs memoizados eso no
ocurre: los campos quedan fuera del registro, `onChange` deja de actualizar los valores y
`formState.isDirty` nunca pasa a `true`. El síntoma visible era que el botón Guardar de
`/admin/configuracion` permanecía deshabilitado en la imagen publicada, aunque en `pnpm dev` y en
Vitest funcionara (allí el compilador no se aplica).

## Alternativas y consecuencias

Se descartó retirar React Compiler de toda la aplicación: la compilación es una optimización
transversal y el fallo se puede contener en los formularios. También se descartó añadir
`"use no memo"` a los formularios: es fácil que un componente nuevo quede fuera de la directiva y
el fallo reaparezca en silencio.

Usar `reset(..., { keepFieldsRef: true })` conserva los refs y evita el fallo inicial, pero tras el
primer reset el registro de montaje queda vacío y los valores visibles no se actualizan en resets
posteriores. Remontar el formulario con una clave derivada de los ajustes guardados restaura el
comportamiento completo: valores nuevos, estado limpio y campos registrados, sin depender de que
los refs se vuelvan a ejecutar.

El coste es un remonte del formulario cuando cambian los ajustes guardados; no se pierde ningún
campo y el guardado normal no cambia. Las pruebas normales no detectan esta clase de fallo porque
el compilador solo se activa en el build. Por eso `pnpm check` ejecuta `pnpm test:compiler` con
`AXIA_REACT_COMPILER=1`; cualquier cambio futuro en un formulario debe mantener esa prueba en verde.
