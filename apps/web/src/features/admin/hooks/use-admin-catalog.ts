import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  adminDependencyLocationIds,
  adminInsert,
  adminList,
  adminSaveDependency,
  adminUpdate,
} from '../api/admin-api'
import type {
  AdminTable,
  AdminValues,
  DependencyValues,
} from '../api/admin-api'

const adminKeys = {
  rows: (table: AdminTable, orderBy: string) =>
    ['admin', table, orderBy] as const,
}

export function useAdminRows(table: AdminTable, orderBy = 'name') {
  return useQuery({
    queryKey: adminKeys.rows(table, orderBy),
    queryFn: () => adminList(table, orderBy),
  })
}

export interface AdminOption {
  id: string
  label: string
}

export interface OptionSource {
  table: AdminTable
  labelColumn: string
}

export function useAdminOptions(sources: OptionSource[]) {
  const results = useQueries({
    queries: sources.map((source) => ({
      queryKey: adminKeys.rows(source.table, source.labelColumn),
      queryFn: () => adminList(source.table, source.labelColumn),
    })),
  })
  const options = new Map<AdminTable, AdminOption[]>()
  sources.forEach((source, index) => {
    const rows = results[index]?.data ?? []
    const labelColumn = source.labelColumn
    options.set(
      source.table,
      rows.map((row) => ({
        id: String(row.id ?? ''),
        label: String(row[labelColumn] ?? ''),
      })),
    )
  })
  return options
}

export function useDependencyLocationIds(id: string) {
  return useQuery({
    queryKey: ['admin', 'dependency-locations', id] as const,
    queryFn: () => adminDependencyLocationIds(id),
    enabled: Boolean(id),
  })
}

export function useDependencySave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id?: string; values: DependencyValues }) =>
      adminSaveDependency(variables.values, variables.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useAdminSave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (variables: {
      table: AdminTable
      id?: string
      values: AdminValues
    }) => {
      if (variables.id) {
        await adminUpdate(variables.table, variables.id, variables.values)
      } else {
        await adminInsert(variables.table, variables.values)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}
