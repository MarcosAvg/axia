# 0076 — Semillas de referencia y demostración

**Fecha:** 2026-10-21
**Estado:** aceptada

## Contexto

Una instalación limpia necesita catálogos para crear tiquets, pero no debe recibir personas ni
tiquets ficticios como si fueran datos reales. La semilla anterior mezclaba ambos mundos y usaba una
contraseña fija de demostración.

## Decisión

1. **Referencia en migraciones.** `0007_reference_catalogs.sql` inserta solo datos necesarios para
   operar: tipos de servicio, prioridades, canales, calendarios, festivos, motivos jerárquicos y
   reglas de escalamiento. No inserta usuarios, técnicos, solicitantes, equipos, edificios,
   categorías ni tiquets.
2. **Demostración explícita.** `pnpm db:next:demo -- --demo` ejecuta la semilla demo. Sin la bandera
   `--demo` no hace nada; con `NODE_ENV=production` se niega; solo acepta una base local
   (`127.0.0.1`, `localhost`, `::1` o el servicio `db` de Compose).
3. **Sin contraseña fija.** La contraseña se toma de `AXIA_DEMO_PASSWORD` o se genera con
   `crypto.randomBytes`; debe tener al menos 12 caracteres. Si se define explícitamente, cada
   ejecución de la semilla la vuelve a aplicar a los usuarios demo existentes. Si se genera, se
   muestra una sola vez y `--reset-passwords` permite rotarla.
4. **Idempotencia.** Los identificadores demo son fijos, las claves naturales usan `on conflict` y
   los eventos, asignaciones y participaciones solo se insertan cuando el tiquet es nuevo. Una
   segunda ejecución no duplica datos. Con `AXIA_DEMO_PASSWORD` definida se reaplica la misma
   contraseña; sin ella no se rotan las contraseñas ya creadas.
5. **Cobertura de estados.** La demo crea un tiquet por cada estado principal de lectura
   (`registered`, `with_supervisor`, `assigned`, `in_progress`, `attended`, `closed`) para que las
   bandejas, la bitácora, los tiempos y los indicadores tengan datos.
6. **La demo no se ejecuta automáticamente** al migrar ni al arrancar el servidor. Es una decisión
   manual de quien instala.

## Consecuencias

- La referencia se aplica una vez como parte de las migraciones y queda versionada.
- La demo se puede borrar/recrear sin tocar la referencia.
- El primer administrador se crea con el flujo de primer arranque; los usuarios demo solo tienen
  roles de supervisor, técnico y solicitante.
- Las contraseñas demo nunca viven en el repositorio.

## Alternativas descartadas

- **Incluir equipos, edificios y categorías en la referencia:** impondría una estructura
  organizacional ficticia a instalaciones reales.
- **Meter la demo en una migración:** se aplicaría en producción sin consentimiento.
- **Mantener una contraseña demo fija:** es un secreto compartido y aparece en documentación,
  scripts y pruebas.
- **Usar `TRUNCATE` o borrar datos antes de sembrar:** podría destruir datos reales si se ejecuta en
  el entorno equivocado.
