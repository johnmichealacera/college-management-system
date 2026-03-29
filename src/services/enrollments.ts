import { supabase } from '@/lib/supabase'
import type { EnrollmentWithRelations } from '@/types/database'

export async function listEnrollmentsWithRelations(
  semesterId: string,
): Promise<EnrollmentWithRelations[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select(
      `
      *,
      student:students (*, program:programs (*)),
      subject:subjects (*),
      semester:semesters (*)
    `,
    )
    .eq('semester_id', semesterId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as EnrollmentWithRelations[]
}

export async function enrollStudent(
  studentId: string,
  subjectId: string,
  semesterId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc('enroll_student', {
    p_student_id: studentId,
    p_subject_id: subjectId,
    p_semester_id: semesterId,
  })
  if (error) throw error
  const result = data as { ok?: boolean; error?: string } | null
  if (!result?.ok) {
    throw new Error(result?.error ?? 'Enrollment failed')
  }
}

export async function deleteEnrollment(id: string): Promise<void> {
  const { error } = await supabase.from('enrollments').delete().eq('id', id)
  if (error) throw error
}
