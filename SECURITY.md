# Seguridad

## Objeto

Indicar cómo reportar una vulnerabilidad y qué prácticas debe respetar el despliegue.

## Versiones soportadas

El proyecto se encuentra en desarrollo (versión `0.0.0`); se atienden los reportes sobre la rama
`main`.

| Versión | Soporte |
|---|---|
| `main` | Sí |
| Anteriores | No |

## Cómo reportar

- Usar un **aviso privado de seguridad** de GitHub: pestaña *Security* → *Advisories* →
  *Report a vulnerability*.
- No abrir un issue público para vulnerabilidades.
- Incluir en el reporte: descripción, pasos para reproducir, impacto y, si es posible, una propuesta
  de corrección.

Se acusará recibo y se coordinará la divulgación una vez disponible la corrección.

## Alcance

Entran en alcance, entre otros:

- Evasión de RLS o escalada de privilegios (roles y permisos).
- Exposición de la clave de servicio o de datos de otras personas.
- Inyección en funciones RPC o en el analizador de archivos de importación.
- Fuga de secretos en el frontend o en los registros.

## Buenas prácticas de despliegue

- La **clave de servicio** (`service role key`) reside solo en el servidor (Edge Functions y tareas).
  Nunca en el frontend, en el repositorio ni en los registros.
- Todos los secretos de la instancia se reemplazan respecto de los valores de ejemplo.
- La base de datos no se expone a internet; ver la advertencia de red en `deploy/README.md`.
- Los archivos `.env` no se incorporan al control de versiones.
