// Textos de avisos in-app (es-MX).

export const notificationMessages = {
  bell: 'Avisos',
  bellUnread: (count: number) => `Avisos, ${count} sin leer`,
  title: 'Avisos',
  subtitle: 'Movimientos recientes que te involucran.',
  empty: 'No hay avisos.',
  loading: 'Cargando avisos…',
  error: 'No se pudieron cargar los avisos.',
  retry: 'Reintentar',
  markRead: 'Marcar como leída',
  markAll: 'Marcar todas',
  markedAll: 'Avisos marcados como leídos.',
  errorAction: 'No se pudo actualizar el aviso.',
  unread: 'Sin leer',
  ticket: 'Tiquet',
  noTicket: 'Sin tiquet asociado',
} as const
