import { useMemo, useState } from 'react'
import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import type { ProxySubject } from '../domain/actions'
import { canRequesterProxy } from '../domain/actions'
import type { TicketDetail, TicketParticipant } from '../domain/types'
import { ticketMessages } from '../i18n'

interface ProxyOption {
  value: string
  label: string
}

const REQUESTER_VALUE = 'requester'

export interface TicketProxy {
  value: string
  setValue: (value: string) => void
  options: ProxyOption[]
  subject: ProxySubject
  canProxy: boolean
}

/**
 * Sujeto de las acciones: nadie (acción propia), el solicitante o un técnico.
 * Solo se ofrecen las opciones que los permisos de la cuenta permiten.
 */
export function useTicketProxy({
  ticket,
  identity,
  participants,
}: {
  ticket: TicketDetail
  identity: Identity | null
  participants: TicketParticipant[]
}): TicketProxy {
  const [value, setValue] = useState('')
  const requesterAllowed = !ticket.isRequester && canRequesterProxy(identity)
  const technicianAllowed = can(identity, 'act_on_behalf')
  const options = useMemo(() => {
    const list: ProxyOption[] = []
    if (requesterAllowed) {
      list.push({
        value: REQUESTER_VALUE,
        label: ticketMessages.proxy.requester(ticket.requesterName),
      })
    }
    if (technicianAllowed) {
      const seen = new Set<string>()
      for (const participant of participants) {
        if (seen.has(participant.technicianId)) continue
        seen.add(participant.technicianId)
        list.push({
          value: participant.technicianId,
          label: participant.technicianName,
        })
      }
    }
    return list
  }, [participants, requesterAllowed, technicianAllowed, ticket.requesterName])

  const selected = options.some((option) => option.value === value) ? value : ''
  const subject: ProxySubject =
    selected === REQUESTER_VALUE
      ? { kind: 'requester', requesterId: ticket.requesterId }
      : selected
        ? { kind: 'technician', technicianId: selected }
        : null

  return {
    value: selected,
    setValue,
    options,
    subject,
    canProxy: options.length > 0,
  }
}
