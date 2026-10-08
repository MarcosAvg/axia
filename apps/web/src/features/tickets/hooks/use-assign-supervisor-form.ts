import { useState } from 'react'
import type { FormEvent } from 'react'
import { useReasons, useTeams } from '@/features/catalogs'
import { useTicketActions } from './use-ticket-actions'
import { useSupervisors } from './use-tickets'

/** Estado y envío de la reasignación de supervisor. */
export function useAssignSupervisorForm(ticketId: string, onClose: () => void) {
  const actions = useTicketActions(ticketId)
  const teams = useTeams()
  const supervisors = useSupervisors()
  const reasons = useReasons('supervisor_reassignment')
  const [mode, setMode] = useState('team')
  const [teamId, setTeamId] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [reasonId, setReasonId] = useState('')
  const [note, setNote] = useState('')
  const toTeam = mode === 'team'

  function submit(event: FormEvent) {
    event.preventDefault()
    const destination = toTeam ? teamId : supervisorId
    if (!destination || !reasonId) return
    actions.assignSupervisor.mutate(
      {
        reasonId,
        teamId: toTeam ? teamId : null,
        supervisorUserId: toTeam ? null : supervisorId,
        note: note || null,
      },
      { onSuccess: onClose },
    )
  }

  return {
    mode,
    setMode,
    teamId,
    setTeamId,
    supervisorId,
    setSupervisorId,
    reasonId,
    setReasonId,
    note,
    setNote,
    submit,
    teams: teams.data ?? [],
    supervisors: supervisors.data ?? [],
    reasons: reasons.data ?? [],
    isPending: actions.assignSupervisor.isPending,
    error: actions.assignSupervisor.error,
  }
}
