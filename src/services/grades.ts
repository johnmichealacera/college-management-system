import { supabase } from '@/lib/supabase'
import type { GradeRow, GradeWithRelations } from '@/types/database'

export async function listGradesWithRelations(semesterId: string): Promise<GradeWithRelations[]> {
  const { data, error } = await supabase
    .from('grades')
    .select(
      `
      *,
      student:students (*, program:programs (*)),
      subject:subjects (*),
      semester:semesters (*)
    `,
    )
    .eq('semester_id', semesterId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as GradeWithRelations[]
}

export async function upsertGrade(row: {
  student_id: string
  subject_id: string
  semester_id: string
  grade_mode: 'numeric' | 'pass_fail'
  numeric_value?: number | null
  pass_fail?: 'pass' | 'fail' | null
}): Promise<GradeRow> {
  const { data: existing } = await supabase
    .from('grades')
    .select('id')
    .eq('student_id', row.student_id)
    .eq('subject_id', row.subject_id)
    .eq('semester_id', row.semester_id)
    .maybeSingle()

  const payload = {
    student_id: row.student_id,
    subject_id: row.subject_id,
    semester_id: row.semester_id,
    grade_mode: row.grade_mode,
    numeric_value: row.grade_mode === 'numeric' ? row.numeric_value ?? null : null,
    pass_fail: row.grade_mode === 'pass_fail' ? row.pass_fail ?? null : null,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('grades')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase.from('grades').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function deleteGrade(id: string): Promise<void> {
  const { error } = await supabase.from('grades').delete().eq('id', id)
  if (error) throw error
}
