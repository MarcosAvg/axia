# Seguridad

## Objeto

Indicar cómo reportar una vulnerabilidad y qué prácticas debe respetar una instalación de Axia.

## Versiones soportadas

El proyecto está en desarrollo (versión `0.0.0`). Se atienden los reportes sobre la rama `main`.

| Versión | Soporte |
|---|---|
| `main` | Sí |
| Anteriores | No |

## Cómo reportar

- Usar un **aviso privado de seguridad** de GitHub: pestaña *Security* → *Advisories* →
  *Report a vulnerability*.
- No abrir un issue público para vulnerabilidades.
- Incluir descripción, pasos para reproducir, impacto y, si es posible, una propuesta de corrección.

Se acusará recibo y se coordinará la divulgación cuando exista una corrección.

## Alcance

Entran en alcance, entre otros:

- Evasión de autorización o escalada de privilegios entre roles y ámbitos.
- Acceso a tiquets, evidencias o notificaciones fuera del alcance del usuario.
- Falsificación de sesión, fijación de sesión o elusión de las comprobaciones de origen.
- Inyección SQL, ejecución de código o carga de archivos maliciosos.
- Fuga de secretos, contraseñas, cookies o datos personales en respuestas o registros.
- Duplicación de acciones offline o alteración de la idempotencia.
- Denegación de servicio provocada por un usuario autenticado.

## Buenas prácticas de despliegue

- La base de datos no se expone a internet. Solo la API queda detrás del reverse proxy TLS.
- `POSTGRES_OWNER_PASSWORD` y `AXIA_APP_PASSWORD` se generan de forma aleatoria y se guardan fuera
  del repositorio.
- El rol de aplicación no tiene permisos de DDL. Las migraciones usan el rol dueño.
- `.env`, dumps y el volumen de evidencias no se versionan.
- El reverse proxy termina TLS y reenvía `X-Forwarded-*`; `TRUST_PROXY=true` solo se activa en una
  red de confianza.
- Las sesiones usan cookies `HttpOnly`, `SameSite=Lax` y expiración absoluta e inactiva.
- Los respaldos se cifran o se almacenan en un medio con acceso restringido.
- Se revisan los registros y se rota cualquier secreto que haya podido exponerse.

## Fuera de alcance

- Vulnerabilidades de dependencias sin una ruta de explotación en Axia.
- Configuraciones de infraestructura ajenas al repositorio, como DNS, cortafuegos o el proveedor TLS.
- Ataques que requieran acceso físico al servidor o credenciales de administrador ya comprometidas.

Las prácticas de instalación y respaldo están en [`docs/guides/operacion.md`](docs/guides/operacion.md).
