# Límites y pendientes

Estado vigente de Axia. El historial de cambios está en el [CHANGELOG](../../CHANGELOG.md); las
decisiones técnicas, en las [ADR](../decisions/README.md).

## Versión y soporte

- Desarrollo pre-1.0. La versión publicada se identifica por el tag `vX.Y.Z`; la última es
  `v0.18.0` (2026-11-09).
- `package.json` conserva `0.0.0` como marcador de desarrollo. La versión de la imagen y del
  paquete de release se toma del tag y del commit, no de ese campo.
- Solo se atiende la rama `main`. Para vulnerabilidades, seguir [Seguridad](../../SECURITY.md).

## Límites conocidos

- **RN-27.** Una acción offline que llega tarde y es rechazada o entra en conflicto se registra,
  pero todavía no se garantiza el efecto requerido por la regla. El servidor sigue siendo la
  autoridad y la interfaz informa el conflicto.
- El alta de tiquets requiere conexión. La cola offline cubre acciones y evidencias, no el alta.
- `auto_validation_days` se configura, pero no existe una tarea programada que valide
  automáticamente.
- Web Push y el escalamiento automático no están implementados. Las notificaciones actuales se
  consultan dentro de la aplicación.
- La interfaz calcula los botones con el permiso; el servidor aplica además ámbito, participación y
  ventana de reclamación. Por eso puede mostrar una acción que luego rechaza.
- La recaptura se limita a los estados registrado, con supervisor y asignado, y no exige motivo.
  Tampoco está disponible mientras el tiquet está en reclamación; primero se resuelve la
  reclamación. La reasignación directa a un supervisor termina en `with_supervisor`.
- El tipo de servicio es opcional en la API de alta y atención; la interfaz lo exige al atender.
- La demo conserva una supervisora con dos equipos. RN-04 limita a uno y esa restricción todavía no
  se impone; no impide el ruteo, pero requiere una revisión específica.

## Pendientes operativos

- Probar la instalación en un host limpio y registrar el resultado.
- Configurar TLS y el proxy de la instancia real.
- Programar respaldos y una restauración de prueba periódica.
- Revisar el digest de la imagen y el canal `latest` antes de cada actualización.

## Cómo reportar

- Vulnerabilidades: aviso privado de GitHub, según [Seguridad](../../SECURITY.md).
- Errores y propuestas: issues del repositorio, con pasos de reproducción y el resultado esperado.
