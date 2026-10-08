# 0035 — Producción: push, CI/CD y Capacitor (Fase 7D)

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

Cierre de la Fase 7: notificaciones push, despliegue continuo y envoltura nativa. Todo depende de
infraestructura real (claves VAPID, servidor/SSH, tiendas), así que se prepara lo que no la exige y
se documenta el resto.

## Decisión

- **Push**: se crea `push_subscriptions` (una fila por endpoint, RLS para que cada usuario administre
  las suyas). La **activación** —claves VAPID, cambio del service worker a `injectManifest` con el
  evento `push` y Edge Function de envío— se documenta en `docs/notificaciones-push.md`; no se
  implementa/despliega aquí porque necesita claves y un entorno.
- **CI/CD**: workflow **manual** `.github/workflows/deploy.yml` que construye el frontend y lo publica
  por `rsync`/SSH. **No** se dispara en cada push y **falla con un mensaje claro** si faltan los
  secretos; las migraciones se aplican aparte (`deploy/README.md`).
- **Capacitor**: **no** se añade; queda documentado como envoltura nativa futura (solo si se pide).
- El escalamiento (job que evalúa `escalation_rules`) se documenta igual: es un cron/Edge Function
  programada que crea `notifications`.

## Alternativas consideradas

- **Cambiar el service worker a `injectManifest` ahora**: riesgo para la PWA sin poder probar el push
  (sin claves); se difiere.
- **Despliegue automático en cada push**: descartado; el despliegue es una decisión de la persona.

## Consecuencias

- La **base de datos** de push y los **scripts de despliegue** quedan listos; la activación es
  cuestión de claves y configuración.
- Las notificaciones in-app ya se registran en `notifications`; falta la bandeja de avisos en la
  interfaz (trabajo futuro).
- Con esto la **Fase 7** queda cerrada en lo preparable desde el repositorio.
