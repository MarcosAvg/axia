# 0070 — Autenticación local y sesiones

**Fecha:** 2026-10-21
**Estado:** aceptada

## Contexto

La app todavía usa Supabase Auth, pero el objetivo es eliminarlo. El servidor nuevo ya tiene
Fastify, PostgreSQL y un contrato de errores. La identidad no puede migrarse parcialmente: si el
login cambia antes que los datos, la UI y la API quedan con identidades distintas.

## Decisión

1. **Usuario y contraseña locales.** `users` guarda `username`, `password_hash` y el estado de la
   cuenta. No se usa correo para iniciar sesión.
2. **Argon2id** con 19 MiB, 2 iteraciones y paralelismo 1. Las contraseñas exigen 12 caracteres y
   no se registran en logs. Los usuarios inexistentes pagan una verificación ficticia para reducir
   la enumeración por tiempo.
3. **Sesiones en PostgreSQL.** El cliente recibe un token aleatorio en la cookie `axia_session`;
   la base guarda solo su SHA-256. La cookie es `HttpOnly`, `SameSite=Lax`, `Path=/` y `Secure` en
   producción. Duración absoluta de 7 días e inactividad de 24 horas. El uso se actualiza con
   throttling para no escribir en cada request.
4. **CSRF mediante origen.** No se añade un token en `localStorage`. Las mutaciones con cookie
   validan `Origin`/`Referer` contra el host y protocolo públicos; sin origen y con cookie se
   rechazan. La cookie es `SameSite=Lax`.
5. **Primer arranque.** Solo se crea un administrador cuando no hay usuarios. La operación usa un
   advisory lock transaccional y asigna el rol `administrator`.
6. **Bloqueo de intentos.** Se registran éxitos y fallos en `login_attempts`. El límite inicial es
   5 fallos por usuario+IP y 20 por IP en 15 minutos; se responde 429 con `Retry-After`.
7. **Administración de cuentas.** El administrador crea usuarios con contraseña temporal,
   restablece contraseñas y revoca sesiones. No hay borrado físico. Un usuario con
   `mustChangePassword` solo puede consultar su identidad, cambiar la contraseña o salir.
8. **Protección del administrador.** No se puede desactivar la propia cuenta ni quitarse el rol
   administrador. Tampoco se puede dejar la instancia sin un administrador activo; la comprobación
   se serializa con un advisory lock.
9. **Semilla de referencia.** Se añaden permisos y roles base (incluido `administrator`) como datos
   de referencia, no como datos demo.
10. **La UI no cambia en este tramo.** El login de la web actual sigue en Supabase hasta el corte
    final; la API local se prueba con HTTP e integración.

## Consecuencias

- El servidor no necesita JWT ni una clave de firma de sesión: el token es opaco y la revocación es
  inmediata en la base.
- El coste de Argon2 se controla con el bloqueo y el límite por IP; el pool de PostgreSQL sigue
  acotado a 10 conexiones.
- La cookie no se puede leer desde JavaScript. El frontend nuevo solo recibe el estado del usuario
  por `/api/auth/me`.
- La autenticación de la PWA se conectará en el tramo 9, junto con el resto del frontend.

## Alternativas descartadas

- **Seguir usando Supabase Auth:** mantiene la dependencia que la migración quiere eliminar.
- **JWT en `localStorage`:** no permite revocación inmediata y expone el token a XSS.
- **Sesiones en memoria:** se pierden al reiniciar y no permiten revocar desde la base.
- **Token CSRF adicional:** `SameSite=Lax` + validación de origen cubre el mismo escenario sin
  duplicar estado; se reconsiderará si aparece un cliente que lo requiera.
