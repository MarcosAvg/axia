# 0083 — React Compiler solo al compilar

- Fecha: 2026-10-24
- Estado: aceptada. Modifica la decisión 0001.

## Contexto

React Compiler se ejecuta desde el pipeline de Babel en cada módulo del SPA. En producción el
coste se paga una vez, pero en desarrollo se paga en cada arranque en frío del servidor y en cada
módulo que Vite transforma por primera vez.

Medición sobre `/login` con la API local activa y la caché de dependencias de Vite vacía:

| Configuración | Tiempo hasta el formulario | Módulos |
|---|---:|---:|
| Con React Compiler en desarrollo | 6.47 s | 207 |
| Sin React Compiler en desarrollo | 2.00 s | 206 |

La diferencia es de más de tres veces y crece en equipos más lentos. El resultado compilado no
cambia: solo se retrasa al momento de compilar.

## Decisión

- `reactCompilerPreset()` se aplica en `vite.config.ts` únicamente cuando `command === 'build'`.
- Se puede forzar en desarrollo con `AXIA_REACT_COMPILER=1` para comprobar una sospecha concreta.
- Las pruebas Vitest y el servidor de desarrollo ejecutan el código sin compilar.
- La compilación de producción y la compuerta completa (`pnpm check`) siguen validando el
  resultado del compilador.

## Alternativas consideradas

- **Mantener el compilador en desarrollo:** conserva paridad total entre desarrollo y producción,
  pero duplica o triplica el tiempo de arranque en frío.
- **Compilar solo archivos `.tsx`:** reduce el coste de 6.47 s a 5.41 s; no compensa la pérdida de
  cobertura sobre hooks en archivos `.ts`.
- **Desactivar los mapas de Babel:** no mejora el tiempo de forma medible.

## Consecuencias

- El ciclo local arranca en frío en cerca de dos segundos.
- Desarrollo y pruebas no ejecutan la memoización automática; el código debe seguir las reglas de
  React, que `eslint-plugin-react-hooks` verifica.
- Un fallo que solo aparezca con el compilador se detecta en `pnpm build` o en producción. Para
  reproducirlo en local, basta con `AXIA_REACT_COMPILER=1 pnpm dev`.
- Revertir es barato: cambiar la condición de `isReactCompilerEnabled`.
