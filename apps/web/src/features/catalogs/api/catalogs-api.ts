// Lectura de catálogos (solo lectura; la administración llega en la Fase 3B).
// Única capa del feature que habla con Supabase.

import { supabase } from '@/lib/supabase'
import type {
  CategoryOption,
  LocationOption,
  Option,
  ProblemOption,
  ReasonOption,
  ReasonUse,
  RequesterOption,
  SubcategoryOption,
  TechnicianOption,
} from '../domain/types'

async function fetchOptions(
  table: 'buildings' | 'dependencies' | 'service_types' | 'channels',
): Promise<Option[]> {
  const { data, error } = await supabase
    .from(table)
    .select('id, name')
    .eq('active', true)
    .order('name')
  if (error) throw error
  return data ?? []
}

export const fetchBuildings = () => fetchOptions('buildings')
export const fetchDependencies = () => fetchOptions('dependencies')
export const fetchServiceTypes = () => fetchOptions('service_types')
export const fetchChannels = () => fetchOptions('channels')

export async function fetchPriorities(): Promise<Option[]> {
  const { data, error } = await supabase
    .from('priorities')
    .select('id, name, position')
    .eq('active', true)
    .order('position')
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, name: row.name }))
}

export async function fetchLocations(
  buildingId: string,
): Promise<LocationOption[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, building_id')
    .eq('active', true)
    .eq('building_id', buildingId)
    .order('name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    buildingId: row.building_id,
  }))
}

export async function fetchCategories(): Promise<CategoryOption[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, team_id')
    .eq('active', true)
    .order('name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    teamId: row.team_id,
  }))
}

export async function fetchSubcategories(
  categoryId: string,
): Promise<SubcategoryOption[]> {
  const { data, error } = await supabase
    .from('subcategories')
    .select('id, name, category_id')
    .eq('active', true)
    .eq('category_id', categoryId)
    .order('name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
  }))
}

export async function fetchProblems(
  subcategoryId: string,
): Promise<ProblemOption[]> {
  const { data, error } = await supabase
    .from('problems')
    .select('id, name, subcategory_id')
    .eq('active', true)
    .eq('subcategory_id', subcategoryId)
    .order('name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    subcategoryId: row.subcategory_id,
  }))
}

export async function fetchRequesters(): Promise<RequesterOption[]> {
  const { data, error } = await supabase
    .from('requesters')
    .select('id, full_name, contact, dependency_id, user_id')
    .eq('active', true)
    .order('full_name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    contact: row.contact,
    dependencyId: row.dependency_id,
    userId: row.user_id,
  }))
}

export async function fetchTechnicians(): Promise<TechnicianOption[]> {
  const { data, error } = await supabase
    .from('technicians')
    .select('id, full_name, team_id')
    .eq('active', true)
    .order('full_name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    teamId: row.team_id,
  }))
}

export async function fetchReasons(use: ReasonUse): Promise<ReasonOption[]> {
  const { data, error } = await supabase
    .from('reasons')
    .select('id, name, use, parent_id')
    .eq('active', true)
    .eq('use', use)
    .order('position')
    .order('name')
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    use: row.use,
    parentId: row.parent_id,
  }))
}
