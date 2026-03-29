import { supabase } from '@/lib/supabase'
import type { Schedule, Subject } from '@/types/database'

export type ScheduleWithSubject = Schedule & { subject: Subject | null }

export async function listSchedulesWithSubjects(semesterId: string): Promise<ScheduleWithSubject[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select(
      `
      *,
      subject:subjects (*)
    `,
    )
    .eq('semester_id', semesterId)
    .order('day_of_week', { ascending: true })
  if (error) throw error
  return (data ?? []) as ScheduleWithSubject[]
}

export async function getScheduleBySubjectAndSemester(
  subjectId: string,
  semesterId: string,
): Promise<Schedule | null> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('semester_id', semesterId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveScheduleForSubject(
  subjectId: string,
  semesterId: string,
  fields: { day_of_week: string; start_time: string; end_time: string; room: string },
): Promise<Schedule> {
  const existing = await getScheduleBySubjectAndSemester(subjectId, semesterId)
  if (existing) {
    const { data, error } = await supabase
      .from('schedules')
      .update({
        day_of_week: fields.day_of_week,
        start_time: fields.start_time,
        end_time: fields.end_time,
        room: fields.room,
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      subject_id: subjectId,
      semester_id: semesterId,
      ...fields,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase.from('schedules').delete().eq('id', id)
  if (error) throw error
}
