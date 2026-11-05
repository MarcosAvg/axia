import type { NotificationItem } from './notification'
import {
  notificationCopy,
  notificationLabel,
  unreadBadge,
} from './notification'

const base: NotificationItem = {
  id: 'n1',
  ticketId: 't1',
  ticketFolio: 'AX-001',
  type: 'assigned_technician',
  payload: {},
  readAt: null,
  createdAt: '2026-11-05T12:00:00.000Z',
  actorName: null,
  reasonName: null,
  context: {
    teamName: 'Equipo A',
    buildingName: 'Edificio A1',
    categoryName: 'Categoría A',
    priorityName: 'Media',
    duplicateFolio: null,
    derivedFolio: null,
    fromPriorityName: null,
    toPriorityName: null,
  },
}

function item(overrides: Partial<NotificationItem>): NotificationItem {
  return {
    ...base,
    ...overrides,
    context: { ...base.context, ...overrides.context },
  }
}

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

describe('notificationCopy', () => {
  it('describe una asignación con autor y contexto', () => {
    const copy = notificationCopy(
      item({
        actorName: 'Ana López',
        context: { ...base.context, categoryName: 'Electricidad' },
      }),
    )
    expect(copy.title).toBe('Te asignaron un tiquet')
    expect(copy.detail).toBe('Ana López te lo asignó. Electricidad Edificio A1')
  })

  it('incluye motivo y nota en un rechazo', () => {
    const copy = notificationCopy(
      item({
        type: 'rejected',
        actorName: 'Luis',
        reasonName: 'Fuera de alcance',
        payload: { note: 'Ya existe otro folio' },
      }),
    )
    expect(copy.title).toBe('Tiquet rechazado')
    expect(copy.detail).toBe(
      'Luis lo rechazó. Motivo: Fuera de alcance. Nota: Ya existe otro folio.',
    )
  })
})

describe('notificationCopy details', () => {
  it('explica el cambio de prioridad y la recaptura', () => {
    const priority = notificationCopy(
      item({
        type: 'priority_changed',
        actorName: 'Marta',
        reasonName: 'Urgencia',
        context: {
          ...base.context,
          fromPriorityName: 'Media',
          toPriorityName: 'Alta',
        },
      }),
    )
    expect(priority.detail).toBe(
      'Marta cambió la prioridad. De Media a Alta. Motivo: Urgencia.',
    )

    const recapture = notificationCopy(
      item({
        type: 'capture_recaptured',
        actorName: 'Marta',
        reasonName: 'Corrección',
        payload: { buildingId: 'b2', categoryId: 'c2', note: 'Dato erróneo' },
      }),
    )
    expect(recapture.detail).toBe(
      'Marta corrigió la captura. Campos: edificio, categoría. Motivo: Corrección. Nota: Dato erróneo.',
    )
  })
})

describe('notificationCopy resolutions', () => {
  it('resuelve duplicados, reclamaciones y calificaciones', () => {
    expect(
      notificationCopy(
        item({
          type: 'duplicate_marked',
          actorName: 'Marta',
          context: { ...base.context, duplicateFolio: 'AX-000' },
        }),
      ).detail,
    ).toBe('Marta lo marcó como duplicado. Duplicado de AX-000.')

    expect(
      notificationCopy(
        item({
          type: 'claim_resolved',
          actorName: 'Marta',
          payload: { resolution: 'new_ticket' },
          context: { ...base.context, derivedFolio: 'AX-002' },
        }),
      ).detail,
    ).toBe(
      'Marta resolvió la reclamación. Se creó un tiquet nuevo. Nuevo tiquet: AX-002.',
    )

    expect(
      notificationCopy(
        item({
          type: 'rated',
          payload: { score: 4, comment: 'Buen trabajo' },
        }),
      ).detail,
    ).toBe('Calificación: 4/5. Comentario: Buen trabajo.')
  })
})

describe('notificationCopy fallback', () => {
  it('conserva un tipo desconocido con su etiqueta', () => {
    const copy = notificationCopy(
      item({ type: 'evento_nuevo', payload: { text: 'Detalle libre' } }),
    )
    expect(copy.title).toBe('evento_nuevo')
    expect(copy.detail).toBe('Detalle libre')
  })
})
