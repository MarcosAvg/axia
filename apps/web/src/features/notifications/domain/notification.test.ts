import { notificationLabel, unreadBadge } from './notification'

describe('notificationLabel', () => {
  it('traduce los eventos conocidos', () => {
    expect(notificationLabel('assigned_technician')).toBe('Técnico asignado')
    expect(notificationLabel('taken')).toBe('Tomado por supervisor')
  })

  it('conserva un tipo desconocido como respaldo', () => {
    expect(notificationLabel('evento_nuevo')).toBe('evento_nuevo')
  })
})

describe('unreadBadge', () => {
  it('compacta contadores grandes', () => {
    expect(unreadBadge(0)).toBe('0')
    expect(unreadBadge(9)).toBe('9')
    expect(unreadBadge(10)).toBe('9+')
  })
})
