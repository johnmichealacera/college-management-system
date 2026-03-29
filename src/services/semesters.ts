import { supabase } from '@/lib/supabase'
import type { Semester } from '@/types/database'

export async function listSemesters(): Promise<Semester[]> {
  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .order('starts_on', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createSemester(row: {
  name: string
  starts_on: string
  ends_on: string
  is_active?: boolean
}): Promise<Semester> {
  const { data, error } = await supabase
    .from('semesters')
    .insert({
      name: row.name,
      starts_on: row.starts_on,
      ends_on: row.ends_on,
      is_active: row.is_active ?? false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSemester(
  id: string,
  row: Partial<Pick<Semester, 'name' | 'starts_on' | 'ends_on' | 'is_active'>>,
): Promise<Semester> {
  const { data, error } = await supabase.from('semesters').update(row).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSemester(id: string): Promise<void> {
  const { error } = await supabase.from('semesters').delete().eq('id', id)
  if (error) throw error
}

export async function setActiveSemesterRpc(id: string): Promise<void> {
  const { error } = await supabase.rpc('set_active_semester', { p_semester_id: id })
  if (error) throw error
}
