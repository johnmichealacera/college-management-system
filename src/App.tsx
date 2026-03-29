import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { ProtectedLayout } from '@/components/protected-layout'
import { DashboardPage } from '@/pages/dashboard-page'
import { EnrollmentsPage } from '@/pages/enrollments-page'
import { GradesPage } from '@/pages/grades-page'
import { LoginPage } from '@/pages/login-page'
import { ProgramsPage } from '@/pages/programs-page'
import { SchedulePage } from '@/pages/schedule-page'
import { SemestersPage } from '@/pages/semesters-page'
import { StudentsPage } from '@/pages/students-page'
import { SubjectsPage } from '@/pages/subjects-page'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/semesters" element={<SemestersPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/enrollments" element={<EnrollmentsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/grades" element={<GradesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
