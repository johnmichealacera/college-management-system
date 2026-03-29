import { supabase } from '@/lib/supabase'
import type { Instructor, Subject } from '@/types/database'

export async function listSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export type SubjectWithInstructor = Subject & { instructor: Instructor | null }

/** Subjects with directory instructor (e.g. schedule UI). */
export async function listSubjectsWithInstructor(): Promise<SubjectWithInstructor[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*, instructor:instructors(*)')
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => {
    const r = row as Subject & { instructor: Instructor | Instructor[] | null }
    const emb = r.instructor
    const instructor = Array.isArray(emb) ? emb[0] ?? null : emb ?? null
    const { instructor: _, ...rest } = r
    return { ...rest, instructor }
  })
}

export async function createSubject(
  row: Omit<Subject, 'id' | 'created_at'>,
): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateSubject(
  id: string,
  row: Partial<Omit<Subject, 'id' | 'created_at'>>,
): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').update(row).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from('subjects').delete().eq('id', id)
  if (error) throw error
}

export type SubjectWithSlots = Subject & {
  enrolled_count: number
  available_slots: number
  instructor: Instructor | null
}

export async function listSubjectsWithEnrollment(semesterId: string): Promise<SubjectWithSlots[]> {
  const { data: subjects, error: subErr } = await supabase
    .from('subjects')
    .select('*, instructor:instructors(*)')
    .order('name', { ascending: true })
  if (subErr) throw subErr
  const rows = (subjects ?? []) as (Subject & { instructor: Instructor | null })[]
  const { data: counts, error } = await supabase
    .from('enrollments')
    .select('subject_id')
    .eq('semester_id', semesterId)
  if (error) throw error
  const bySubject = new Map<string, number>()
  for (const row of counts ?? []) {
    const sid = row.subject_id
    bySubject.set(sid, (bySubject.get(sid) ?? 0) + 1)
  }
  return rows.map((s) => {
    const enrolled = bySubject.get(s.id) ?? 0
    const { instructor: emb, ...rest } = s
    const instructor = Array.isArray(emb) ? emb[0] ?? null : emb ?? null
    return {
      ...rest,
      instructor,
      enrolled_count: enrolled,
      available_slots: Math.max(0, s.max_capacity - enrolled),
    }
  })
}
