import type { Profile } from '../domain/access'
import type { useAccountsData } from '../hooks/use-accounts'
import { UsersTable } from './users-table'

/** Tabla de cuentas: envuelve `UsersTable` con los datos de acceso. */
export function AccountsTable({
  visible,
  data,
  sort,
  onSort,
  onToggle,
  onEdit,
  onReset,
  onRevoke,
}: {
  visible: Profile[]
  data: ReturnType<typeof useAccountsData>
  sort: Parameters<typeof UsersTable>[0]['sort']
  onSort: Parameters<typeof UsersTable>[0]['onSortChange']
  onToggle: Parameters<typeof UsersTable>[0]['onToggleActive']
  onEdit?: Parameters<typeof UsersTable>[0]['onEditRoles']
  onReset: Parameters<typeof UsersTable>[0]['onResetPassword']
  onRevoke: Parameters<typeof UsersTable>[0]['onRevokeSessions']
}) {
  return (
    <UsersTable
      profiles={visible}
      roles={data.roleList}
      assignments={data.assignmentList}
      requesters={data.peopleData.requesters}
      technicians={data.peopleData.technicians}
      sort={sort}
      onSortChange={onSort}
      onToggleActive={onToggle}
      onEditRoles={onEdit}
      onResetPassword={onReset}
      onRevokeSessions={onRevoke}
    />
  )
}
