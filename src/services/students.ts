import { supabase } from '@/lib/supabase'
import type { Student, StudentWithProgram } from '@/types/database'

export async function listStudents(): Promise<StudentWithProgram[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*, program:programs(*)')
    .order('full_name', { ascending: true })
  if (error) throw error
  return (data ?? []) as StudentWithProgram[]
}

export type NewStudentInput = {
  full_name: string
  program_id: string
  year_level: string
}

export async function createStudent(row: NewStudentInput): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .insert({
      full_name: row.full_name,
      program_id: row.program_id,
      year_level: row.year_level,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStudent(
  id: string,
  row: Partial<Pick<Student, 'full_name' | 'program_id' | 'year_level'>>,
): Promise<Student> {
  const { data, error } = await supabase.from('students').update(row).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw error
}
