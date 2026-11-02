import { describe, expect, it } from 'vitest'

import type { TechnicianOption } from '@/features/catalogs'
import { assignmentState, listTechnicians } from './assignment-form'

const leader: TechnicianOption = {
  id: 'leader',
  fullName: 'Técnico líder',
  teamId: 'team',
  categoryIds: ['category-a'],
}
const auxiliary: TechnicianOption = {
  id: 'auxiliary',
  fullName: 'Técnico auxiliar',
  teamId: 'team',
  categoryIds: ['category-b'],
}

describe('assignmentState', () => {
  it('does not require a reason for the first assignment of a leader', () => {
    expect(
      assignmentState({
        action: 'assign_technician',
        ticket: { categoryId: 'category-a', status: 'with_supervisor' },
        technicians: [leader, auxiliary],
        technicianId: leader.id,
        fallbackReasonUse: 'pause',
      }),
    ).toMatchObject({
      canLead: true,
      reasonRequired: false,
      reasonUse: 'technician_reassignment',
    })
  })

  it('requires a reason to reassign the leader', () => {
    expect(
      assignmentState({
        action: 'assign_technician',
        ticket: { categoryId: 'category-a', status: 'assigned' },
        technicians: [leader, auxiliary],
        technicianId: leader.id,
        fallbackReasonUse: 'pause',
      }),
    ).toMatchObject({
      canLead: true,
      reasonRequired: true,
      reasonUse: 'technician_reassignment',
    })
  })
})

describe('assignmentState auxiliary', () => {
  it('treats a non-designated technician as auxiliary with a reason', () => {
    expect(
      assignmentState({
        action: 'assign_technician',
        ticket: { categoryId: 'category-a', status: 'with_supervisor' },
        technicians: [leader, auxiliary],
        technicianId: auxiliary.id,
        fallbackReasonUse: 'pause',
      }),
    ).toMatchObject({
      canLead: false,
      reasonRequired: true,
      reasonUse: 'auxiliary_support',
    })
  })

  it('always requires a reason for the auxiliary action', () => {
    expect(
      assignmentState({
        action: 'add_auxiliary',
        ticket: { categoryId: 'category-a', status: 'assigned' },
        technicians: [leader, auxiliary],
        technicianId: '',
        fallbackReasonUse: 'auxiliary_support',
      }),
    ).toMatchObject({
      reasonRequired: true,
      reasonUse: 'auxiliary_support',
    })
  })
})

describe('listTechnicians', () => {
  it('excludes active participants only for the auxiliary action', () => {
    expect(
      listTechnicians([leader, auxiliary], 'add_auxiliary', ['leader']),
    ).toEqual([auxiliary])
    expect(
      listTechnicians([leader, auxiliary], 'assign_technician', ['leader']),
    ).toEqual([leader, auxiliary])
  })
})
