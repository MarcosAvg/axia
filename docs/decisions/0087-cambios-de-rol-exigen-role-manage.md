# 0087 — Los cambios de rol exigen `role.manage`

- Fecha: 2026-10-25
- Estado: aceptada

## Contexto

La administración de cuentas tenía dos caminos. `/api/admin/users` usaba `assertRoleChange` para
proteger al último administrador, pero no exigía `role.manage` para **asignar** roles. Las rutas
`/api/admin/access/user-roles` hacían lo mismo con el guard `user.manage`. El resultado: una cuenta
con solo `user.manage` podía añadirse el rol `administrator`, crear otro administrador o restablecer
la contraseña de un administrador. La interfaz ya protegía el rol Administrador y al último
administrador, pero esa protección era solo visual.

Además, la ruta `PATCH /api/admin/access/profiles/:id` actualizaba `active` sin pasar por las
comprobaciones de `updateUser`, y el rol Administrador se podía desactivar desde la API.

## Decisión

- Asignar o quitar roles exige `role.manage`. `createUser` y `updateUser` lo comprueban en el
  servicio, no solo en la ruta.
- `removeUserRole` ejecuta `assertRoleChange` dentro de la transacción, con el bloqueo de
  administración. Así se mantienen la protección del último administrador y la de la propia cuenta.
- `PATCH /api/admin/access/profiles/:id` reutiliza `auth.updateUser`; elimina la copia que saltaba
  las comprobaciones.
- El rol Administrador no se puede desactivar ni cambiarle permisos desde la API. La protección de
  la interfaz pasa a ser también una regla del servidor.
- Restablecer la contraseña de una cuenta administradora exige `role.manage`.

## Consecuencias

- Una persona con `user.manage` y sin `role.manage` puede activar, desactivar, restablecer
  contraseñas de cuentas no administradoras y revocar sesiones, pero no crear cuentas ni asignar
  roles. Crear una cuenta exige ambos permisos porque toda cuenta nace con al menos un rol.
- La matriz de permisos vuelve a ser la fuente de verdad: `role.manage` ya no es opcional para los
  cambios de rol.
- Las pruebas de `auth-roles.test.ts` cubren la autoasignación, la creación de administradores, el
  restablecimiento de contraseña y las dos rutas que desactivaban al último administrador.
