// Textos de la autenticación (es-MX). Centralizados aquí, nunca incrustados en la lógica.

export const authMessages = {
  signOut: 'Cerrar sesión',
  loading: 'Cargando…',
  login: {
    title: 'Inicia sesión',
    description: 'Accede con tu cuenta de Axia.',
    email: 'Correo electrónico',
    password: 'Contraseña',
    submit: 'Entrar',
    submitting: 'Entrando…',
    errors: {
      email: 'Escribe un correo válido.',
      password: 'Escribe tu contraseña.',
      invalid: 'El correo o la contraseña no son correctos.',
      unknown: 'No se pudo iniciar sesión. Intenta de nuevo.',
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
