// Textos de la autenticación (es-MX). Centralizados aquí, nunca incrustados en la lógica.

export const authMessages = {
  signOut: 'Cerrar sesión',
  loading: 'Cargando…',
  login: {
    title: 'Inicia sesión',
    description: 'Accede con tu cuenta de Axia.',
    brandDescription:
      'Sigue cada tiquet en todo momento: en qué estado está y, si no avanza, por qué.',
    username: 'Usuario',
    password: 'Contraseña',
    submit: 'Entrar',
    submitting: 'Entrando…',
    errors: {
      username: 'Escribe tu usuario.',
      password: 'Escribe tu contraseña.',
      invalid: 'El usuario o la contraseña no son correctos.',
      unknown: 'No se pudo iniciar sesión. Intenta de nuevo.',
    },
  },
  password: {
    title: 'Cambia tu contraseña',
    current: 'Contraseña actual',
    new: 'Contraseña nueva',
    confirm: 'Repite la contraseña nueva',
    submit: 'Guardar contraseña',
    submitting: 'Guardando…',
    errors: {
      confirm: 'Las contraseñas no coinciden.',
      unknown: 'No se pudo cambiar la contraseña. Intenta de nuevo.',
    },
  },
  setup: {
    title: 'Primer arranque',
    description:
      'Crea la primera cuenta de administración de esta instalación.',
    username: 'Usuario',
    fullName: 'Nombre completo',
    password: 'Contraseña',
    confirmPassword: 'Repite la contraseña',
    submit: 'Crear administrador',
    submitting: 'Creando…',
    errors: {
      username:
        'Usa entre 3 y 64 caracteres: minúsculas, números, punto, guion o guion bajo.',
      fullName: 'El nombre es obligatorio.',
      password: 'La contraseña debe tener al menos 12 caracteres.',
      confirm: 'Las contraseñas no coinciden.',
      unknown: 'No se pudo crear el administrador. Intenta de nuevo.',
    },
  },
  dashboard: {
    welcome: 'Hola',
    description: 'Aquí verás tus bandejas y el estado de tus tiquets.',
    roles: 'Roles',
    noRoles:
      'Todavía no tienes roles asignados. Pide a un administrador que te los asigne.',
  },
  profile: {
    title: 'Mi perfil',
    description: 'Tu nombre y tu teléfono o extensión de contacto.',
    sections: {
      data: 'Datos de la cuenta',
      account: 'Cuenta',
    },
    roles: 'Roles',
    timezone: 'Zona horaria',
    fullName: 'Nombre completo',
    phone: 'Teléfono o extensión',
    submit: 'Guardar cambios',
    saving: 'Guardando…',
    saved: 'Tu perfil se guardó.',
    errors: {
      fullName: 'El nombre es obligatorio.',
      unknown: 'No se pudo guardar tu perfil. Intenta de nuevo.',
    },
  },
  forbidden: {
    title: 'Sin acceso',
    description: 'No tienes permiso para ver esta sección.',
    action: 'Volver al panel',
  },
  admin: {
    title: 'Administración',
    description:
      'Aquí irán los catálogos, los usuarios y los roles. Llegan en la Fase 3.',
  },
} as const

/** Etiquetas en español de los roles semilla; un rol desconocido se muestra tal cual. */
const roleLabels: Record<string, string> = {
  administrator: 'Administrador',
  supervisor: 'Supervisor',
  technician: 'Técnico',
  requester: 'Solicitante',
}

export function roleLabel(role: string): string {
  return roleLabels[role] ?? role
}
