import { useState } from 'react'
import { ErrorAlert, LoadingList } from '@/components/shared/async-state'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import type { LinkablePerson, Profile } from '../domain/access'
import { accountNameFor, filterPeople } from '../domain/user-list'
import {
  useLinkRequesterUser,
  useLinkTechnicianUser,
  usePeople,
  useProfiles,
} from '../hooks/use-access'
import { adminMessages } from '../i18n'
import { AdminToolbar } from './admin-toolbar'
import { LinkDialog } from './link-dialog'

interface LinkTableProps {
  title: string
  people: LinkablePerson[]
  profiles: Profile[]
  onChange: (person: LinkablePerson) => void
}

function LinkTable({ title, people, profiles, onChange }: LinkTableProps) {
  const [query, setQuery] = useState('')
  const { users, list } = adminMessages
  const rows = filterPeople(people, profiles, query)

  const columns: DataTableColumn<LinkablePerson>[] = [
    {
      id: 'full_name',
      header: users.person,
      sortable: true,
      cell: (person) => <span className="font-medium">{person.fullName}</span>,
    },
    {
      id: 'account',
      header: users.linkedAccount,
      cell: (person) =>
        accountNameFor(profiles, person.userId) ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (person) => (
        <Button variant="outline" size="sm" onClick={() => onChange(person)}>
          {users.changeLink}
        </Button>
      ),
    },
  ]

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <AdminToolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={users.searchPeople}
        countText={`${rows.length} ${list.results}`}
      />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{list.empty}</p>
      ) : (
        <DataTable columns={columns} rows={rows} getRowId={(p) => p.id} />
      )}
    </section>
  )
}

type Linking = { kind: 'requester' | 'technician'; person: LinkablePerson }

function LinkEditor({
  linking,
  profiles,
  onClose,
}: {
  linking: Linking | null
  profiles: Profile[]
  onClose: () => void
}) {
  const linkRequester = useLinkRequesterUser()
  const linkTechnician = useLinkTechnicianUser()
  const { users } = adminMessages
  if (!linking) return null

  const person = linking.person
  const isRequester = linking.kind === 'requester'
  function save(userId: string | null) {
    const options = { onSuccess: onClose }
    if (isRequester) {
      linkRequester.mutate({ requesterId: person.id, userId }, options)
    } else {
      linkTechnician.mutate({ technicianId: person.id, userId }, options)
    }
  }

  return (
    <LinkDialog
      title={users.linkTitle}
      description={users.linkHelp}
      personName={person.fullName}
      profiles={profiles}
      currentUserId={person.userId}
      isSaving={linkRequester.isPending || linkTechnician.isPending}
      onSave={save}
      onClose={onClose}
    />
  )
}

/** Vínculos entre las cuentas y los catálogos de solicitantes y técnicos. */
export function UserLinks() {
  const people = usePeople()
  const profiles = useProfiles()
  const [linking, setLinking] = useState<Linking | null>(null)
  const { list, users } = adminMessages

  if (people.isLoading) return <LoadingList rows={3} />
  if (people.isError) return <ErrorAlert message={list.error} />

  const profileList = profiles.data ?? []

  return (
    <div className="flex flex-col gap-8">
      <LinkTable
        title={users.requesters}
        people={people.data?.requesters ?? []}
        profiles={profileList}
        onChange={(person) => setLinking({ kind: 'requester', person })}
      />
      <LinkTable
        title={users.technicians}
        people={people.data?.technicians ?? []}
        profiles={profileList}
        onChange={(person) => setLinking({ kind: 'technician', person })}
      />
      <LinkEditor
        linking={linking}
        profiles={profileList}
        onClose={() => setLinking(null)}
      />
    </div>
  )
}
