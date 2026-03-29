import { supabase } from '@/lib/supabase'
import type { Instructor } from '@/types/database'

export async function listInstructors(): Promise<Instructor[]> {
  const { data, error } = await supabase
    .from('instructors')
    .select('*')
    .order('full_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createInstructor(row: {
  full_name: string
  email: string
}): Promise<Instructor> {
  const payload = {
    full_name: row.full_name.trim(),
    email: row.email.trim().toLowerCase(),
  }
  const { data, error } = await supabase.from('instructors').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateInstructor(
  id: string,
  row: Partial<Pick<Instructor, 'full_name' | 'email'>>,
): Promise<Instructor> {
  const payload: Partial<{ full_name: string; email: string }> = {}
  if (row.full_name !== undefined) payload.full_name = row.full_name.trim()
  if (row.email !== undefined) payload.email = row.email.trim().toLowerCase()
  const { data, error } = await supabase.from('instructors').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteInstructor(id: string): Promise<void> {
  const { error } = await supabase.from('instructors').delete().eq('id', id)
  if (error) throw error
}
