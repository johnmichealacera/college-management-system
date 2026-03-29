import { schoolYearLabel } from '@/lib/school-year'
import { fetchDashboardStats, fetchEnrollmentPerSubject } from '@/services/dashboard'
import type { Semester } from '@/types/database'

export async function buildAssistantContextSnapshot(input: {
  pathname: string
  semester: Semester | null
}): Promise<Record<string, unknown>> {
  const activeSemester = input.semester
    ? {
        id: input.semester.id,
        name: input.semester.name,
        schoolYear: schoolYearLabel(input.semester.starts_on, input.semester.ends_on),
        starts_on: input.semester.starts_on,
        ends_on: input.semester.ends_on,
        is_active: input.semester.is_active,
      }
    : null

  const base: Record<string, unknown> = {
    app: 'LocalWeb College Admin',
    currentPath: input.pathname,
    activeSemester,
  }

  if (!input.semester) {
    return {
      ...base,
      dashboard: null,
      note: 'No term is selected in the header; enrollment and dashboard numbers are unavailable until a term is chosen.',
    }
  }

  const [dashboardStats, enrollmentBySubject] = await Promise.all([
    fetchDashboardStats(input.semester.id),
    fetchEnrollmentPerSubject(input.semester.id),
  ])

  return {
    ...base,
    dashboard: {
      totalStudents: dashboardStats.totalStudents,
      totalSubjects: dashboardStats.totalSubjects,
      enrolledStudentsThisTerm: dashboardStats.enrolledStudents,
      enrollmentBySubjectTop: enrollmentBySubject.slice(0, 15),
    },
  }
}
