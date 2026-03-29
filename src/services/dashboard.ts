import { supabase } from '@/lib/supabase'

export type DashboardStats = {
  totalStudents: number
  totalSubjects: number
  enrolledStudents: number
}

export async function fetchDashboardStats(semesterId: string): Promise<DashboardStats> {
  const [students, subjects, enrollments] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('subjects').select('id', { count: 'exact', head: true }),
    supabase.from('enrollments').select('student_id').eq('semester_id', semesterId),
  ])

  if (students.error) throw students.error
  if (subjects.error) throw subjects.error
  if (enrollments.error) throw enrollments.error

  const distinctStudents = new Set((enrollments.data ?? []).map((e) => e.student_id))

  return {
    totalStudents: students.count ?? 0,
    totalSubjects: subjects.count ?? 0,
    enrolledStudents: distinctStudents.size,
  }
}

export type EnrollmentPerSubject = { name: string; count: number }

export async function fetchEnrollmentPerSubject(semesterId: string): Promise<EnrollmentPerSubject[]> {
  const { data: subjects, error: sErr } = await supabase.from('subjects').select('id, name')
  if (sErr) throw sErr
  const { data: enrollments, error: eErr } = await supabase
    .from('enrollments')
    .select('subject_id')
    .eq('semester_id', semesterId)
  if (eErr) throw eErr

  const counts = new Map<string, number>()
  for (const e of enrollments ?? []) {
    counts.set(e.subject_id, (counts.get(e.subject_id) ?? 0) + 1)
  }

  return (subjects ?? [])
    .map((sub) => ({
      name: sub.name,
      count: counts.get(sub.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
}
